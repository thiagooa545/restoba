-- ─────────────────────────────────────────────────────────────
-- 005 · Mesas y reservas (RF-07)
--
-- Reservar exige nivel de Usuario Verificado (T&C art. 5), y la
-- reserva es además lo que después habilita reseñar ese local
-- (T&C art. 7.5).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE mesa (
  id             SERIAL      PRIMARY KEY,
  restaurante_id INTEGER     NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  numero         VARCHAR(10) NOT NULL,
  capacidad      SMALLINT    NOT NULL,
  estado         VARCHAR(16) NOT NULL DEFAULT 'libre',

  CONSTRAINT capacidad_valida CHECK (capacidad BETWEEN 1 AND 20),
  CONSTRAINT estado_mesa_valido CHECK (estado IN ('libre', 'ocupada', 'reservada')),
  CONSTRAINT numero_unico_por_local UNIQUE (restaurante_id, numero)
);

CREATE INDEX idx_mesa_restaurante ON mesa (restaurante_id, capacidad);

CREATE TABLE reserva (
  id                SERIAL      PRIMARY KEY,
  restaurante_id    INTEGER     NOT NULL REFERENCES restaurante(id) ON DELETE CASCADE,
  comensal_id       INTEGER     NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  -- Si la mesa se da de baja, la reserva sobrevive: el local reasigna.
  mesa_id           INTEGER     REFERENCES mesa(id) ON DELETE SET NULL,

  fecha             DATE        NOT NULL,
  hora              TIME        NOT NULL,
  cantidad_personas SMALLINT    NOT NULL,
  estado            VARCHAR(16) NOT NULL DEFAULT 'confirmada',
  notas             TEXT,

  creada_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelada_en      TIMESTAMPTZ,

  CONSTRAINT personas_validas CHECK (cantidad_personas BETWEEN 1 AND 20),
  CONSTRAINT estado_reserva_valido
    CHECK (estado IN ('confirmada', 'cancelada', 'cumplida', 'no_show'))
);

CREATE INDEX idx_reserva_local_fecha ON reserva (restaurante_id, fecha, hora);
CREATE INDEX idx_reserva_comensal    ON reserva (comensal_id, fecha DESC);

-- Una mesa no puede estar reservada dos veces en el mismo turno.
-- El índice parcial deja fuera las canceladas, que sí pueden repetirse.
CREATE UNIQUE INDEX idx_mesa_sin_doble_reserva
  ON reserva (mesa_id, fecha, hora)
  WHERE estado = 'confirmada' AND mesa_id IS NOT NULL;
