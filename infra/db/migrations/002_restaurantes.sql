-- ════════════════════════════════════════════════════════════════════
-- PARA LA EXPOSICIÓN
--
-- El corazón del buscador: restaurante, tipos de cocina y horarios.
--
-- El cambio más importante respecto del DER original está acá abajo. El documento
-- guardaba la posición en dos columnas sueltas, latitud y longitud. Las
-- reemplazamos por una sola columna de tipo geográfico.
--
-- Por qué: con dos números sueltos, para saber qué restaurante está cerca habría
-- que traerlos TODOS a la aplicación y calcular uno por uno. Con el tipo
-- geográfico y su índice, la base devuelve solo los que están en el radio, ya
-- ordenados por distancia. Sin este cambio PostGIS no aportaría nada.
--
-- Responde a: RF-03 (cercanía) y RNF-02 (rendimiento).
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 002 · Restaurantes, tipos de cocina y horarios
--
-- Es el núcleo del lado público (RF-02 a RF-05). Las tablas del
-- lado del comensal son globales: no llevan restaurante_id.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE tipo_cocina (
  id     SERIAL       PRIMARY KEY,
  nombre VARCHAR(60)  NOT NULL,
  -- Identificador estable para la URL del buscador (?cocina=pastas)
  slug   VARCHAR(60)  NOT NULL UNIQUE
);

CREATE TABLE restaurante (
  id                SERIAL        PRIMARY KEY,
  nombre            VARCHAR(120)  NOT NULL,
  descripcion       TEXT,

  -- Suscripción. El detalle de períodos y comprobantes de transferencia
  -- llega con la tabla `suscripcion` en la Fase B; acá vive el estado
  -- que decide si el local se muestra o no.
  plan              VARCHAR(20)   NOT NULL DEFAULT 'basico',
  estado            VARCHAR(24)   NOT NULL DEFAULT 'activa',

  direccion         VARCHAR(180)  NOT NULL,
  barrio            VARCHAR(80),
  ciudad            VARCHAR(80)   NOT NULL DEFAULT 'Ciudad Autónoma de Buenos Aires',

  -- Reemplaza a las columnas latitud/longitud del DER original.
  -- Es lo que permite resolver la cercanía dentro de la base (RF-03).
  ubicacion         geography(Point, 4326) NOT NULL,

  rango_precio      SMALLINT      NOT NULL DEFAULT 2,
  telefono          VARCHAR(40),

  -- Se recalcula al publicarse una reseña (RF-06, etapa A3).
  -- NULL mientras no haya ninguna: un local sin reseñas no debe romper el orden.
  calificacion_prom NUMERIC(2,1),
  cantidad_resenas  INTEGER       NOT NULL DEFAULT 0,

  creado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT estado_valido
    CHECK (estado IN ('activa', 'pendiente_acreditacion', 'vencida', 'cancelada')),
  CONSTRAINT rango_precio_valido
    CHECK (rango_precio BETWEEN 1 AND 3),
  CONSTRAINT calificacion_valida
    CHECK (calificacion_prom IS NULL OR calificacion_prom BETWEEN 1 AND 5)
);

-- Sin este índice, ST_DWithin recorre la tabla entera.
CREATE INDEX idx_restaurante_ubicacion ON restaurante USING GIST (ubicacion);
CREATE INDEX idx_restaurante_estado    ON restaurante (estado);
CREATE INDEX idx_restaurante_nombre    ON restaurante (normalizar(nombre));

-- Relación N:M del DER: un local puede tener varios tipos de cocina.
CREATE TABLE restaurante_tipo_cocina (
  restaurante_id INTEGER NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  tipo_cocina_id INTEGER NOT NULL REFERENCES tipo_cocina(id) ON DELETE CASCADE,
  PRIMARY KEY (restaurante_id, tipo_cocina_id)
);

CREATE INDEX idx_rtc_tipo ON restaurante_tipo_cocina (tipo_cocina_id);

-- Horarios de atención. Un mismo día puede tener dos turnos
-- (mediodía y noche), por eso no hay unicidad por día.
CREATE TABLE horario (
  id             SERIAL   PRIMARY KEY,
  restaurante_id INTEGER  NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  -- 0 = domingo … 6 = sábado, igual que EXTRACT(DOW)
  dia_semana     SMALLINT NOT NULL,
  abre           TIME     NOT NULL,
  cierra         TIME     NOT NULL,

  CONSTRAINT dia_valido CHECK (dia_semana BETWEEN 0 AND 6)
);

CREATE INDEX idx_horario_restaurante ON horario (restaurante_id, dia_semana);
