-- ════════════════════════════════════════════════════════════════════
-- PARA LA EXPOSICIÓN
--
-- El personal del restaurante y la suscripción que paga el local.
--
-- Acá arranca la Fase B. Hasta esta migración el sistema solo conocía
-- comensales: gente que busca, reserva y reseña. Ahora aparece el otro
-- lado del modelo de negocio, el que paga.
--
-- La diferencia clave entre las dos tablas de personas:
--
--   comensal  es GLOBAL. No pertenece a ningún restaurante. Busca en
--             todos, reserva en cualquiera.
--   usuario   pertenece SIEMPRE a un restaurante. Es el administrador,
--             el mozo o el cocinero de ESE local y de ninguno otro.
--
-- Ese restaurante_id de la tabla usuario es el que hace posible el
-- aislamiento multiempresa (RF-12): cada consulta del panel filtra por
-- el restaurante del usuario que inició sesión, así que un local no
-- puede ver los datos de otro ni por error ni a propósito.
--
-- Responde a: RF-08, RF-12 y Términos y Condiciones art. 10.
-- ════════════════════════════════════════════════════════════════════

-- ── El personal del local ────────────────────────────────────
-- Los tres roles salen del apartado 9 del documento, «Actores del sistema»:
--   admin  → carga el perfil, la carta, el stock y ve los reportes
--   mozo   → toma pedidos, consulta mesas y cobra
--   cocina → ve los pedidos pendientes y cambia su estado

CREATE TABLE usuario (
  id             SERIAL       PRIMARY KEY,
  restaurante_id INTEGER      NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  nombre         VARCHAR(120) NOT NULL,
  email          VARCHAR(180) NOT NULL,
  password_hash  CHAR(60)     NOT NULL,
  rol            VARCHAR(16)  NOT NULL,
  activo         BOOLEAN      NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT rol_valido CHECK (rol IN ('admin', 'mozo', 'cocina')),
  -- El correo es único en todo el sistema, no por local: si no, la misma
  -- dirección podría iniciar sesión en dos restaurantes y no sabríamos en cuál.
  CONSTRAINT email_unico UNIQUE (email)
);

CREATE INDEX idx_usuario_restaurante ON usuario (restaurante_id, activo);

-- Sesiones del personal, separadas de las del comensal. Son dos mundos
-- distintos: un mozo no navega el buscador con su cuenta de trabajo.
CREATE TABLE sesion_staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  INTEGER     NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  expira_en   TIMESTAMPTZ NOT NULL,
  revocada_en TIMESTAMPTZ,
  ip          INET,
  user_agent  TEXT,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sesion_staff_usuario ON sesion_staff (usuario_id) WHERE revocada_en IS NULL;

-- ── La suscripción ───────────────────────────────────────────
-- El artículo 10 de los T&C: el restaurante paga por transferencia bancaria
-- directa, FUERA de la plataforma. Acá no se procesan pagos ni se guardan
-- datos de tarjeta o CBU: se registra que el período fue abonado y quién lo
-- acreditó. El comprobante es el número de operación que pasa el local.

CREATE TABLE suscripcion (
  id             SERIAL         PRIMARY KEY,
  restaurante_id INTEGER        NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  plan           VARCHAR(20)    NOT NULL,
  periodo_desde  DATE           NOT NULL,
  periodo_hasta  DATE           NOT NULL,
  monto          NUMERIC(10, 2) NOT NULL,
  estado         VARCHAR(24)    NOT NULL DEFAULT 'pendiente_acreditacion',
  -- Número de operación de la transferencia, que informa el restaurante.
  comprobante    VARCHAR(120),
  acreditada_en  TIMESTAMPTZ,
  creada_en      TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT estado_suscripcion_valido
    CHECK (estado IN ('activa', 'pendiente_acreditacion', 'vencida', 'cancelada')),
  CONSTRAINT periodo_coherente CHECK (periodo_hasta > periodo_desde),
  CONSTRAINT monto_valido CHECK (monto >= 0)
);

CREATE INDEX idx_suscripcion_restaurante ON suscripcion (restaurante_id, periodo_hasta DESC);
