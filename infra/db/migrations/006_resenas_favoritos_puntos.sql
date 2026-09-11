-- ════════════════════════════════════════════════════════════════════
-- PARA LA EXPOSICIÓN
--
-- Reseñas, favoritos y el libro mayor de puntos.
--
-- Dos reglas del negocio que se vuelven restricciones de la base:
--
-- 1. Solo se puede reseñar un local donde exista una visita previa. No es una
--    validación de pantalla que se pueda saltear: se comprueba antes de guardar.
--
-- 2. Los puntos se llevan como movimientos, no como un contador que se pisa.
--    Positivo cuando acumula, negativo cuando canjea, y el saldo es la suma. El
--    artículo 8 de los Términos dice que los Puntos no son dinero y que su
--    movimiento tiene que poder auditarse: con un contador simple no se podría
--    reconstruir de dónde salió cada punto.
--
-- Responde a: RF-06 y Términos y Condiciones arts. 7 y 8.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 006 · Reseñas, favoritos, puntos y cupones
--   RF-06 y Términos y Condiciones arts. 7 y 8.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE resena (
  id             SERIAL      PRIMARY KEY,
  restaurante_id INTEGER     NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,

  -- Al dar de baja la cuenta se pone en NULL y la reseña queda publicada sin
  -- dueño: es la anonimización del art. 7.6, no un borrado.
  comensal_id    INTEGER     REFERENCES comensal(id) ON DELETE SET NULL,
  -- Nombre mostrado, congelado al publicar. Sobrevive a la anonimización.
  autor          VARCHAR(80) NOT NULL,

  -- La visita que habilita la reseña (art. 7.5). Sin esto no se puede reseñar.
  reserva_id     INTEGER     REFERENCES reserva(id) ON DELETE SET NULL,

  puntuacion     SMALLINT    NOT NULL,
  comentario     TEXT,

  -- Derecho a réplica del local (art. 7.7).
  respuesta      TEXT,
  respuesta_en   TIMESTAMPTZ,

  -- Moderación: se oculta, no se borra, y deja de contar para el promedio.
  oculta_en      TIMESTAMPTZ,

  creada_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  editada_en     TIMESTAMPTZ,

  CONSTRAINT puntuacion_valida CHECK (puntuacion BETWEEN 1 AND 5),
  -- Una reseña por visita.
  CONSTRAINT una_resena_por_reserva UNIQUE (reserva_id)
);

CREATE INDEX idx_resena_restaurante ON resena (restaurante_id, creada_en DESC);
CREATE INDEX idx_resena_comensal    ON resena (comensal_id);

CREATE TABLE favorito (
  comensal_id    INTEGER     NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  restaurante_id INTEGER     NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comensal_id, restaurante_id)
);

CREATE TABLE cupon (
  id              SERIAL      PRIMARY KEY,
  comensal_id     INTEGER     NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  codigo          VARCHAR(16) NOT NULL UNIQUE,
  titulo          VARCHAR(120) NOT NULL,
  puntos_gastados INTEGER     NOT NULL,
  vence_en        DATE        NOT NULL,
  usado_en        TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT puntos_gastados_validos CHECK (puntos_gastados > 0)
);

CREATE INDEX idx_cupon_comensal ON cupon (comensal_id, creado_en DESC);

-- Libro mayor de puntos: positivo acumula, negativo canjea. El saldo es la
-- suma, nunca un contador que se pisa (art. 8: los Puntos no son dinero y su
-- movimiento tiene que poder auditarse).
CREATE TABLE movimiento_puntos (
  id             SERIAL      PRIMARY KEY,
  comensal_id    INTEGER     NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  puntos         INTEGER     NOT NULL,
  motivo         VARCHAR(24) NOT NULL,
  restaurante_id INTEGER     REFERENCES restaurante(id) ON DELETE SET NULL,
  reserva_id     INTEGER     REFERENCES reserva(id) ON DELETE SET NULL,
  resena_id      INTEGER     REFERENCES resena(id) ON DELETE SET NULL,
  cupon_id       INTEGER     REFERENCES cupon(id) ON DELETE SET NULL,
  detalle        VARCHAR(140),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT motivo_valido
    CHECK (motivo IN ('visita', 'resena', 'canje')),
  CONSTRAINT puntos_no_cero CHECK (puntos <> 0)
);

CREATE INDEX idx_movimiento_comensal ON movimiento_puntos (comensal_id, creado_en DESC);

-- Los puntos de una visita se acreditan una sola vez, aunque la liquidación
-- corra muchas veces.
CREATE UNIQUE INDEX idx_puntos_una_vez_por_visita
  ON movimiento_puntos (reserva_id) WHERE motivo = 'visita';

CREATE UNIQUE INDEX idx_puntos_una_vez_por_resena
  ON movimiento_puntos (resena_id) WHERE motivo = 'resena';
