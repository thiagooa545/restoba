-- ─────────────────────────────────────────────────────────────
-- 004 · Comensales, sesiones y constancias de aceptación legal
--
-- El comensal es global: no pertenece a ningún restaurante, así que
-- no lleva restaurante_id. La tabla aceptacion_legal se toma tal cual
-- del DDL publicado en legal/README.md.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE comensal (
  id                  SERIAL       PRIMARY KEY,
  nombre              VARCHAR(120) NOT NULL,
  -- Se guarda siempre en minúsculas para que el UNIQUE sirva de verdad.
  email               VARCHAR(180) NOT NULL UNIQUE,
  -- bcrypt costo 12 (Anexo Técnico, secc. 3). Nunca en texto legible.
  password_hash       CHAR(60)     NOT NULL,

  email_verificado    BOOLEAN      NOT NULL DEFAULT false,
  -- AES-256-GCM (Anexo Técnico, secc. 5), formato iv:tag:cifrado en hex.
  telefono_cifrado    TEXT,
  telefono_verificado BOOLEAN      NOT NULL DEFAULT false,

  -- Códigos de confirmación: se guarda el SHA-256, nunca el código.
  codigo_email        CHAR(64),
  codigo_email_vence  TIMESTAMPTZ,
  codigo_tel          CHAR(64),
  codigo_tel_vence    TIMESTAMPTZ,

  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Baja de cuenta: las reseñas se anonimizan, el registro se conserva
  -- por el plazo de la Política de Privacidad (T&C art. 7.6).
  baja_en             TIMESTAMPTZ
);

-- Sesiones abiertas. El refresh token viaja en una cookie httpOnly y su
-- identificador vive acá, para poder revocarlo al cerrar sesión.
CREATE TABLE sesion (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comensal_id INTEGER     NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  expira_en   TIMESTAMPTZ NOT NULL,
  revocada_en TIMESTAMPTZ,
  ip          INET,
  user_agent  TEXT,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sesion_comensal ON sesion (comensal_id) WHERE revocada_en IS NULL;

-- ── Constancias de aceptación ────────────────────────────────
-- DDL tomado de legal/README.md. La constancia NO se borra nunca:
-- al revocar se completa revocado_en.

CREATE TABLE aceptacion_legal (
  id           SERIAL       PRIMARY KEY,
  usuario_id   INTEGER      NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  documento    VARCHAR(32)  NOT NULL,  -- 'tyc' | 'privacidad' | 'verificacion'
  version      VARCHAR(16)  NOT NULL,  -- '1.0'
  hash_texto   CHAR(64)     NOT NULL,  -- SHA-256 del texto exhibido
  aceptado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revocado_en  TIMESTAMPTZ,            -- NULL mientras esté vigente
  ip           INET,
  user_agent   TEXT,
  CONSTRAINT documento_valido
    CHECK (documento IN ('tyc', 'privacidad', 'verificacion')),
  CONSTRAINT una_aceptacion_por_version
    UNIQUE (usuario_id, documento, version)
);

CREATE INDEX idx_aceptacion_usuario ON aceptacion_legal (usuario_id, documento);
