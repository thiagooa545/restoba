-- ════════════════════════════════════════════════════════════════════
-- PARA LA EXPOSICIÓN
--
-- El inventario: ingredientes, recetas y movimientos de stock.
--
-- Esta migración responde a la pregunta que nos hicieron en la defensa:
-- «¿quién carga el stock?». Lo carga el administrador del restaurante,
-- desde su panel, sobre estas tablas.
--
-- La idea central es que el stock NO se lleva por plato sino por
-- ingrediente. Un restaurante no tiene «doce milanesas napolitanas en
-- depósito»: tiene kilos de carne, de queso y de pan rallado. Por eso
-- hacen falta dos tablas y no una:
--
--   ingrediente            lo que hay en el depósito, con su unidad
--   producto_ingrediente   la receta: cuánto de cada ingrediente lleva
--                          cada plato de la carta
--
-- Con esas dos, cuando alguien pide una milanesa el sistema sabe solo
-- cuánta carne descontar. Eso es lo que va a hacer la etapa siguiente,
-- cuando existan los pedidos.
--
-- La relación producto_ingrediente es la N:M que el DER ya preveía:
-- un plato usa muchos ingredientes y un ingrediente está en muchos
-- platos. La cantidad vive en la relación, no en ninguno de los dos
-- lados, porque depende del par.
--
-- Responde a: RF-08 (gestión de stock) y RF-12.
-- ════════════════════════════════════════════════════════════════════

-- ── Lo que hay en el depósito ────────────────────────────────

CREATE TABLE ingrediente (
  id             SERIAL         PRIMARY KEY,
  restaurante_id INTEGER        NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  nombre         VARCHAR(120)   NOT NULL,

  -- La unidad importa: no es lo mismo descontar 0,2 de un kilo que de una
  -- unidad. Se guarda con tres decimales porque las recetas van en gramos.
  unidad         VARCHAR(12)    NOT NULL,
  stock_actual   NUMERIC(12, 3) NOT NULL DEFAULT 0,

  -- Cuando stock_actual cae por debajo de este valor, el panel avisa. No
  -- es cero: avisar recién cuando no queda nada llega tarde para reponer.
  stock_minimo   NUMERIC(12, 3) NOT NULL DEFAULT 0,

  costo_unitario NUMERIC(12, 2),
  activo         BOOLEAN        NOT NULL DEFAULT true,
  actualizado_en TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT unidad_valida
    CHECK (unidad IN ('kg', 'g', 'l', 'ml', 'unidad', 'docena', 'atado')),
  CONSTRAINT stock_no_negativo CHECK (stock_actual >= 0),
  CONSTRAINT minimo_no_negativo CHECK (stock_minimo >= 0),
  -- Un mismo local no puede tener dos ingredientes con el mismo nombre,
  -- pero dos locales distintos sí pueden tener «Mozzarella» cada uno.
  CONSTRAINT ingrediente_unico_por_local UNIQUE (restaurante_id, nombre)
);

CREATE INDEX idx_ingrediente_restaurante ON ingrediente (restaurante_id, activo);

-- Los que están por debajo del mínimo, que es lo que el panel muestra primero.
CREATE INDEX idx_ingrediente_bajo_minimo
  ON ingrediente (restaurante_id)
  WHERE stock_actual <= stock_minimo;

-- ── La receta de cada plato ──────────────────────────────────

CREATE TABLE producto_ingrediente (
  producto_id    INTEGER        NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  ingrediente_id INTEGER        NOT NULL REFERENCES ingrediente(id) ON DELETE CASCADE,
  -- Cuánto se consume de ese ingrediente por cada unidad del plato,
  -- expresado en la unidad del ingrediente.
  cantidad       NUMERIC(12, 3) NOT NULL,

  PRIMARY KEY (producto_id, ingrediente_id),
  CONSTRAINT cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_receta_ingrediente ON producto_ingrediente (ingrediente_id);

-- ── El libro de movimientos ──────────────────────────────────
-- El DER pedía stock_actual en la tabla de ingredientes, y ahí está. Esta
-- tabla es un agregado nuestro: guarda CADA cambio de stock con su motivo
-- y quién lo hizo.
--
-- Por qué agregarla si el número ya está arriba: con solo stock_actual se
-- sabe cuánto hay, pero no por qué. Si un martes faltan tres kilos de
-- carne, la diferencia entre «se vendieron» y «se perdieron» no se puede
-- reconstruir. Con el libro sí.
--
-- Es el mismo criterio que usamos con los puntos del comensal: el saldo
-- es una consecuencia de los movimientos, no un número suelto.

CREATE TABLE movimiento_stock (
  id             SERIAL         PRIMARY KEY,
  restaurante_id INTEGER        NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  ingrediente_id INTEGER        NOT NULL REFERENCES ingrediente(id) ON DELETE CASCADE,

  -- Positivo entra al depósito, negativo sale. El signo lo dice todo.
  cantidad       NUMERIC(12, 3) NOT NULL,
  motivo         VARCHAR(16)    NOT NULL,

  -- Stock que quedó después del movimiento. Se guarda para poder auditar
  -- sin tener que sumar toda la historia cada vez.
  saldo          NUMERIC(12, 3) NOT NULL,

  -- Quién lo hizo. Queda en NULL si esa cuenta se dio de baja: el
  -- movimiento no se borra por eso.
  usuario_id     INTEGER        REFERENCES usuario(id) ON DELETE SET NULL,
  nota           TEXT,
  creado_en      TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT motivo_valido
    CHECK (motivo IN ('compra', 'ajuste', 'consumo', 'merma', 'inicial')),
  CONSTRAINT cantidad_no_nula CHECK (cantidad <> 0)
);

CREATE INDEX idx_movimiento_stock_local ON movimiento_stock (restaurante_id, creado_en DESC);
CREATE INDEX idx_movimiento_stock_ingrediente ON movimiento_stock (ingrediente_id, creado_en DESC);
