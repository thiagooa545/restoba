-- LA CARPETA  infra/db/migrations/
--
-- La base de datos completa, en ocho archivos que se aplican en orden.
-- El número del principio es el orden: no se puede crear la tabla de reservas
-- antes que la de mesas.
--
-- Qué crea cada uno:
--
--   001_extensiones.sql          ← este. Las extensiones, entre ellas PostGIS.
--   002_restaurantes.sql         Restaurantes, tipos de cocina y horarios.
--   003_carta.sql                Categorías y platos.
--   004_comensal_y_legal.sql     Cuentas, sesiones y constancias de aceptación.
--   005_reservas.sql             Mesas y reservas.
--   006_resenas_favoritos_puntos.sql  Reseñas, favoritos, cupones y puntos.
--   007_personal_y_suscripcion.sql    Empleados del local y su suscripción.
--   008_inventario.sql           Ingredientes, recetas y movimientos de stock.
--
-- Las dos últimas son de la Fase B, la parte que usan los restaurantes.
--
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

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE OR REPLACE FUNCTION normalizar(texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT lower(public.unaccent('public.unaccent', texto));
$$;
