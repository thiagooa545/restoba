-- ─────────────────────────────────────────────────────────────
-- 001 · Extensiones de PostgreSQL
--
-- postgis  → consultas por cercanía (RF-03). Sin esto no hay
--            ST_DWithin ni ST_Distance ni el tipo geography.
-- pgcrypto → gen_random_uuid() para identificadores de token.
-- unaccent → buscar «bodegon» y que encuentre «bodegón».
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Función de normalización para las búsquedas por texto del buscador.
-- IMMUTABLE para poder usarla dentro de un índice.
CREATE OR REPLACE FUNCTION normalizar(texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT lower(public.unaccent('public.unaccent', texto));
$$;
