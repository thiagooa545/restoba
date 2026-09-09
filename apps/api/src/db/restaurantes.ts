import type {
  Busqueda,
  CategoriaCarta,
  CocinaResumen,
  HorarioDia,
  RestauranteDetalle,
  RestauranteResultado,
} from '@restoba/shared'
import { consultar, consultarUna } from './pool.js'

/** Zona horaria del proyecto. Los horarios se evalúan siempre en hora local. */
const TZ = 'America/Argentina/Buenos_Aires'

/**
 * Momento actual en Buenos Aires, disponible como `ahora.dow` y `ahora.hora`.
 * Se calcula en la base para que no dependa del reloj del servidor de la API.
 */
const CTE_AHORA = `
  WITH ahora AS (
    SELECT EXTRACT(DOW FROM (now() AT TIME ZONE '${TZ}'))::int AS dow,
           (now() AT TIME ZONE '${TZ}')::time                  AS hora
  )
`

/**
 * Turno de atención en curso, si lo hay.
 *
 * Contempla los turnos que cruzan la medianoche (20:00–00:30): a las 00:15 del
 * miércoles el local sigue abierto por la fila del martes, no por la del miércoles.
 */
const LATERAL_TURNO = `
  LEFT JOIN LATERAL (
    SELECT h.cierra
    FROM   horario h
    WHERE  h.restaurante_id = r.id
      AND (
            (h.dia_semana = ahora.dow AND h.cierra > h.abre
              AND ahora.hora >= h.abre AND ahora.hora <= h.cierra)
        OR  (h.dia_semana = ahora.dow AND h.cierra < h.abre
              AND ahora.hora >= h.abre)
        OR  (h.dia_semana = (ahora.dow + 6) % 7 AND h.cierra < h.abre
              AND ahora.hora <= h.cierra)
      )
    LIMIT 1
  ) turno ON true
`

/** Tipos de cocina del restaurante, como JSON, para no hacer una consulta por fila. */
const COCINAS_JSON = `
  COALESCE((
    SELECT json_agg(json_build_object('nombre', tc.nombre, 'slug', tc.slug) ORDER BY tc.nombre)
    FROM   restaurante_tipo_cocina rtc
    JOIN   tipo_cocina tc ON tc.id = rtc.tipo_cocina_id
    WHERE  rtc.restaurante_id = r.id
  ), '[]'::json) AS cocinas
`

type FilaRestaurante = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string
  barrio: string | null
  lat: number
  lng: number
  rango_precio: number
  calificacion_prom: string | null
  cantidad_resenas: number
  cocinas: CocinaResumen[]
  distancia: string | null
  cierra_a: string | null
  tiene_horarios: boolean
}

function aResultado(fila: FilaRestaurante): RestauranteResultado {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    direccion: fila.direccion,
    barrio: fila.barrio,
    lat: fila.lat,
    lng: fila.lng,
    rangoPrecio: fila.rango_precio,
    // NUMERIC llega como string desde pg: se convierte una sola vez, acá.
    calificacion: fila.calificacion_prom === null ? null : Number(fila.calificacion_prom),
    resenas: fila.cantidad_resenas,
    cocinas: fila.cocinas,
    distancia: fila.distancia === null ? null : Math.round(Number(fila.distancia)),
    abierto: fila.tiene_horarios ? fila.cierra_a !== null : null,
    // TIME llega como '00:30:00'; a la interfaz le alcanza con hora y minutos.
    cierraA: fila.cierra_a === null ? null : fila.cierra_a.slice(0, 5),
  }
}

type ResultadoBusqueda = {
  filas: RestauranteResultado[]
  total: number
}

/**
 * Buscador (RF-02, RF-03, RF-04).
 *
 * Solo devuelve locales con la suscripción activa: es la regla del modelo de
 * negocio, y por eso vive en la consulta y no en la interfaz.
 */
export async function buscarRestaurantes(
  criterios: Busqueda & { radio?: number },
): Promise<ResultadoBusqueda> {
  const { cocina, q, lat, lng, radio, orden, precio, puntajeMinimo, limite } = criterios
  const conUbicacion = lat !== undefined && lng !== undefined

  const parametros: unknown[] = []
  const p = (valor: unknown): string => {
    parametros.push(valor)
    return `$${parametros.length}`
  }

  const pLng = conUbicacion ? p(lng) : null
  const pLat = conUbicacion ? p(lat) : null
  const punto = conUbicacion ? `ST_MakePoint(${pLng}, ${pLat})::geography` : null

  const condiciones: string[] = ["r.estado = 'activa'"]

  if (cocina) {
    condiciones.push(`EXISTS (
      SELECT 1 FROM restaurante_tipo_cocina rtc
      JOIN   tipo_cocina tc ON tc.id = rtc.tipo_cocina_id
      WHERE  rtc.restaurante_id = r.id AND tc.slug = ${p(cocina)}
    )`)
  }

  if (q) {
    // El buscador de la portada es «por tipo de comida», así que el texto libre
    // también tiene que pegarle a la cocina: quien escribe «bodegon» espera los
    // bodegones, no solo los locales que tengan esa palabra en el nombre.
    // normalizar() saca acentos y mayúsculas.
    const patron = p(`%${q}%`)
    condiciones.push(
      `(normalizar(r.nombre) LIKE normalizar(${patron})
        OR normalizar(COALESCE(r.barrio, '')) LIKE normalizar(${patron})
        OR EXISTS (
             SELECT 1 FROM restaurante_tipo_cocina rtc2
             JOIN   tipo_cocina tc2 ON tc2.id = rtc2.tipo_cocina_id
             WHERE  rtc2.restaurante_id = r.id
               AND  normalizar(tc2.nombre) LIKE normalizar(${patron})
           ))`,
    )
  }

  if (punto && radio !== undefined) {
    condiciones.push(`ST_DWithin(r.ubicacion, ${punto}, ${p(radio)})`)
  }

  if (precio && precio.length > 0) {
    condiciones.push(`r.rango_precio = ANY(${p(precio)}::int[])`)
  }

  if (puntajeMinimo !== undefined) {
    condiciones.push(`r.calificacion_prom >= ${p(puntajeMinimo)}`)
  }

  const distancia = punto ? `ST_Distance(r.ubicacion, ${punto})` : 'NULL::float8'

  // Lista blanca: `orden` viene de un enum de Zod, nunca del texto crudo del usuario.
  // NULLS LAST es lo que evita que un local sin reseñas rompa el orden.
  const ordenSql =
    orden === 'cercania' && punto
      ? 'distancia ASC NULLS LAST'
      : orden === 'mixto'
        ? punto
          ? '(COALESCE(r.calificacion_prom, 0) - distancia / 3000.0) DESC'
          : 'r.calificacion_prom DESC NULLS LAST, r.cantidad_resenas DESC'
        : 'r.calificacion_prom DESC NULLS LAST, r.cantidad_resenas DESC'

  const where = condiciones.join('\n      AND ')

  const sql = `
    ${CTE_AHORA}
    SELECT r.id, r.nombre, r.descripcion, r.direccion, r.barrio,
           ST_Y(r.ubicacion::geometry) AS lat,
           ST_X(r.ubicacion::geometry) AS lng,
           r.rango_precio, r.calificacion_prom, r.cantidad_resenas,
           ${distancia} AS distancia,
           turno.cierra::text AS cierra_a,
           EXISTS (SELECT 1 FROM horario h2 WHERE h2.restaurante_id = r.id) AS tiene_horarios,
           ${COCINAS_JSON},
           count(*) OVER () AS total
    FROM   restaurante r
    CROSS JOIN ahora
    ${LATERAL_TURNO}
    WHERE  ${where}
    ORDER BY ${ordenSql}, r.id
    LIMIT  ${p(limite)}
  `

  const filas = await consultar<FilaRestaurante & { total: string }>(sql, parametros)

  return {
    filas: filas.map(aResultado),
    total: filas.length > 0 ? Number(filas[0]!.total) : 0,
  }
}

/** Perfil completo: datos, horarios y carta (RF-05). */
export async function obtenerRestaurante(
  id: number,
  ubicacion?: { lat: number; lng: number },
): Promise<RestauranteDetalle | null> {
  const parametros: unknown[] = [id]
  const punto = ubicacion
    ? `ST_MakePoint($${parametros.push(ubicacion.lng)}, $${parametros.push(ubicacion.lat)})::geography`
    : null

  const fila = await consultarUna<FilaRestaurante & { telefono: string | null; ciudad: string }>(
    `
    ${CTE_AHORA}
    SELECT r.id, r.nombre, r.descripcion, r.direccion, r.barrio, r.ciudad, r.telefono,
           ST_Y(r.ubicacion::geometry) AS lat,
           ST_X(r.ubicacion::geometry) AS lng,
           r.rango_precio, r.calificacion_prom, r.cantidad_resenas,
           ${punto ? `ST_Distance(r.ubicacion, ${punto})` : 'NULL::float8'} AS distancia,
           turno.cierra::text AS cierra_a,
           EXISTS (SELECT 1 FROM horario h2 WHERE h2.restaurante_id = r.id) AS tiene_horarios,
           ${COCINAS_JSON}
    FROM   restaurante r
    CROSS JOIN ahora
    ${LATERAL_TURNO}
    WHERE  r.id = $1 AND r.estado = 'activa'
    `,
    parametros,
  )

  if (!fila) return null

  const horarios = await consultar<{ dia_semana: number; abre: string; cierra: string }>(
    `SELECT dia_semana, abre::text AS abre, cierra::text AS cierra
     FROM   horario
     WHERE  restaurante_id = $1
     ORDER BY dia_semana, abre`,
    [id],
  )

  const porDia = new Map<number, HorarioDia>()
  for (const h of horarios) {
    let dia = porDia.get(h.dia_semana)
    if (!dia) {
      dia = { dia: h.dia_semana, turnos: [] }
      porDia.set(h.dia_semana, dia)
    }
    dia.turnos.push({ abre: h.abre.slice(0, 5), cierra: h.cierra.slice(0, 5) })
  }

  const productos = await consultar<{
    categoria_id: number
    categoria: string
    id: number
    nombre: string
    descripcion: string | null
    precio: string
    activo: boolean
    vegetariano: boolean
    sin_tacc: boolean
    destacado: boolean
  }>(
    `SELECT c.id AS categoria_id, c.nombre AS categoria,
            p.id, p.nombre, p.descripcion, p.precio,
            p.activo, p.vegetariano, p.sin_tacc, p.destacado
     FROM   producto p
     JOIN   categoria c ON c.id = p.categoria_id
     -- El filtro por restaurante_id va en las DOS tablas: es el aislamiento
     -- multiempresa (RF-12), no una redundancia.
     WHERE  p.restaurante_id = $1 AND c.restaurante_id = $1
     ORDER BY c.orden, p.orden`,
    [id],
  )

  const carta = new Map<number, CategoriaCarta>()
  for (const pr of productos) {
    let cat = carta.get(pr.categoria_id)
    if (!cat) {
      cat = { id: pr.categoria_id, nombre: pr.categoria, productos: [] }
      carta.set(pr.categoria_id, cat)
    }
    cat.productos.push({
      id: pr.id,
      nombre: pr.nombre,
      descripcion: pr.descripcion,
      precio: Number(pr.precio),
      activo: pr.activo,
      vegetariano: pr.vegetariano,
      sinTacc: pr.sin_tacc,
      destacado: pr.destacado,
    })
  }

  return {
    ...aResultado(fila),
    telefono: fila.telefono,
    ciudad: fila.ciudad,
    horarios: [...porDia.values()],
    carta: [...carta.values()],
  }
}

/** Tipos de cocina que hoy tienen al menos un local activo. */
export async function listarTiposCocina(): Promise<(CocinaResumen & { cantidad: number })[]> {
  return consultar<CocinaResumen & { cantidad: number }>(
    `SELECT tc.nombre, tc.slug, count(*)::int AS cantidad
     FROM   tipo_cocina tc
     JOIN   restaurante_tipo_cocina rtc ON rtc.tipo_cocina_id = tc.id
     JOIN   restaurante r ON r.id = rtc.restaurante_id AND r.estado = 'activa'
     GROUP BY tc.id, tc.nombre, tc.slug
     ORDER BY count(*) DESC, tc.nombre`,
  )
}
