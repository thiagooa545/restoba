-- ════════════════════════════════════════════════════════════════════
-- PARA LA EXPOSICIÓN
--
-- Primera migración: las extensiones que necesita la base.
--
-- Qué es una migración: cada cambio de la base queda escrito en un archivo
-- numerado que se aplica en orden. Cualquiera levanta la base desde cero con un
-- comando y le queda idéntica a la de los demás.
--
-- El sistema guarda la huella de cada archivo ya aplicado, así que una migración
-- usada no se puede editar: hay que crear una nueva. Eso evita que dos
-- integrantes terminen con bases distintas sin darse cuenta.
--
-- postgis es la extensión que habilita la búsqueda por cercanía (RF-03).
-- ════════════════════════════════════════════════════════════════════

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
