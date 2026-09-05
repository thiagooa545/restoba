-- ─────────────────────────────────────────────────────────────
-- 003 · La carta: categorías y productos
--
-- Primeras tablas operativas, así que ya llevan restaurante_id:
-- el aislamiento multiempresa (RF-12) empieza acá.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE categoria (
  id             SERIAL      PRIMARY KEY,
  restaurante_id INTEGER     NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  nombre         VARCHAR(80) NOT NULL,
  orden          SMALLINT    NOT NULL DEFAULT 0
);

CREATE INDEX idx_categoria_restaurante ON categoria (restaurante_id, orden);

CREATE TABLE producto (
  id             SERIAL         PRIMARY KEY,
  restaurante_id INTEGER        NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  categoria_id   INTEGER        NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  nombre         VARCHAR(120)   NOT NULL,
  descripcion    TEXT,
  precio         NUMERIC(10, 2) NOT NULL,
  imagen         VARCHAR(255),

  -- `activo` en false es «hoy no hay»: en la Fase B lo va a poner
  -- automáticamente el descuento de stock de ingredientes.
  activo         BOOLEAN        NOT NULL DEFAULT true,

  vegetariano    BOOLEAN        NOT NULL DEFAULT false,
  sin_tacc       BOOLEAN        NOT NULL DEFAULT false,
  destacado      BOOLEAN        NOT NULL DEFAULT false,
  orden          SMALLINT       NOT NULL DEFAULT 0,

  CONSTRAINT precio_valido CHECK (precio >= 0)
);

CREATE INDEX idx_producto_restaurante ON producto (restaurante_id, categoria_id, orden);
