import {
  PUNTOS_POR_RESENA,
  type Resena,
  type ResumenResenas,
  type VisitaSinResenar,
} from '@restoba/compartido'
import type { PoolClient } from 'pg'
import { consultar, consultarUna, enTransaccion } from './pool.js'

const TZ = 'America/Argentina/Buenos_Aires'

type FilaResena = {
  id: number
  autor: string
  comensal_id: number | null
  puntuacion: number
  comentario: string | null
  creada_en: string
  editada_en: string | null
  reserva_id: number | null
  respuesta: string | null
  respuesta_en: string | null
}

function aResena(f: FilaResena, comensalId: number | null): Resena {
  return {
    id: f.id,
    autor: f.autor,
    puntuacion: f.puntuacion,
    comentario: f.comentario,
    fecha: f.creada_en,
    editada: f.editada_en !== null,
    verificada: f.reserva_id !== null,
    respuesta: f.respuesta,
    respuestaEn: f.respuesta_en,
    mia: comensalId !== null && f.comensal_id === comensalId,
  }
}

export async function resenasDe(
  restauranteId: number,
  comensalId: number | null,
): Promise<{ resenas: Resena[]; resumen: ResumenResenas }> {
  const filas = await consultar<FilaResena>(
    `SELECT id, autor, comensal_id, puntuacion, comentario, reserva_id,
            respuesta, respuesta_en::text AS respuesta_en,
            creada_en::text AS creada_en, editada_en::text AS editada_en
     FROM   resena
     WHERE  restaurante_id = $1 AND oculta_en IS NULL
     -- La propia primero, después las más nuevas.
     ORDER BY (comensal_id IS NOT DISTINCT FROM $2) DESC, creada_en DESC`,
    [restauranteId, comensalId],
  )

  const conteo = await consultar<{ puntuacion: number; n: string }>(
    `SELECT puntuacion, count(*)::text AS n
     FROM   resena
     WHERE  restaurante_id = $1 AND oculta_en IS NULL
     GROUP BY puntuacion`,
    [restauranteId],
  )

  const distribucion: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let total = 0
  let suma = 0
  for (const c of conteo) {
    const n = Number(c.n)
    distribucion[String(c.puntuacion)] = n
    total += n
    suma += n * c.puntuacion
  }

  return {
    resenas: filas.map((f) => aResena(f, comensalId)),
    resumen: {
      promedio: total === 0 ? null : Math.round((suma / total) * 10) / 10,
      total,
      distribucion,
    },
  }
}

/**
 * Vuelve a calcular el promedio y el total del restaurante a partir de las
 * reseñas visibles. Se llama dentro de la misma transacción que publica o
 * edita una reseña: el promedio nunca queda desfasado del detalle.
 */
async function recalcular(cliente: PoolClient, restauranteId: number): Promise<void> {
  await cliente.query(
    `UPDATE restaurante r
     SET    calificacion_prom = sub.prom,
            cantidad_resenas  = sub.n
     FROM (
       SELECT round(avg(puntuacion)::numeric, 1) AS prom, count(*)::int AS n
       FROM   resena
       WHERE  restaurante_id = $1 AND oculta_en IS NULL
     ) sub
     WHERE r.id = $1`,
    [restauranteId],
  )
}

/**
 * Visitas ya ocurridas que todavía no tienen reseña.
 *
 * Es la condición del art. 7.5: solo se puede reseñar un local en el que haya
 * una reserva cumplida. Si esta lista está vacía, no hay nada que reseñar.
 */
export function visitasSinResenar(
  comensalId: number,
  restauranteId?: number,
): Promise<VisitaSinResenar[]> {
  return consultar<VisitaSinResenar>(
    `SELECT rv.id AS "reservaId", rv.restaurante_id AS "restauranteId",
            r.nombre AS restaurante,
            to_char(rv.fecha, 'YYYY-MM-DD') AS fecha,
            to_char(rv.hora, 'HH24:MI') AS hora
     FROM   reserva rv
     JOIN   restaurante r ON r.id = rv.restaurante_id
     LEFT JOIN resena re ON re.reserva_id = rv.id
     WHERE  rv.comensal_id = $1
       AND  rv.estado IN ('confirmada', 'cumplida')
       AND  (rv.fecha + rv.hora) <= (now() AT TIME ZONE '${TZ}')
       AND  re.id IS NULL
       AND  ($2::int IS NULL OR rv.restaurante_id = $2)
     ORDER BY rv.fecha DESC, rv.hora DESC`,
    [comensalId, restauranteId ?? null],
  )
}

type ResultadoResena =
  | { ok: true; id: number; puntos: number }
  | { ok: false; motivo: 'sin_visita' | 'ya_resenada' }

export async function crearResena(datos: {
  comensalId: number
  autor: string
  reservaId: number
  puntuacion: number
  comentario?: string
}): Promise<ResultadoResena> {
  return enTransaccion(async (cliente) => {
    // La reserva tiene que ser de quien reseña, estar cumplida y no tener
    // reseña previa. Se vuelve a chequear acá dentro, no solo en la ruta.
    const { rows: visitas } = await cliente.query<{ restaurante_id: number }>(
      `SELECT rv.restaurante_id
       FROM   reserva rv
       LEFT JOIN resena re ON re.reserva_id = rv.id
       WHERE  rv.id = $1 AND rv.comensal_id = $2
         AND  rv.estado IN ('confirmada', 'cumplida')
         AND  (rv.fecha + rv.hora) <= (now() AT TIME ZONE '${TZ}')
         AND  re.id IS NULL
       FOR UPDATE OF rv`,
      [datos.reservaId, datos.comensalId],
    )

    const visita = visitas[0]
    if (!visita) {
      const { rows: existe } = await cliente.query(
        'SELECT 1 FROM resena WHERE reserva_id = $1',
        [datos.reservaId],
      )
      return { ok: false as const, motivo: existe.length ? ('ya_resenada' as const) : ('sin_visita' as const) }
    }

    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO resena (restaurante_id, comensal_id, autor, reserva_id, puntuacion, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        visita.restaurante_id,
        datos.comensalId,
        datos.autor,
        datos.reservaId,
        datos.puntuacion,
        datos.comentario ?? null,
      ],
    )
    const resenaId = rows[0]!.id

    await cliente.query(`UPDATE reserva SET estado = 'cumplida' WHERE id = $1`, [datos.reservaId])
    await recalcular(cliente, visita.restaurante_id)

    await cliente.query(
      `INSERT INTO movimiento_puntos (comensal_id, puntos, motivo, restaurante_id, resena_id, detalle)
       VALUES ($1, $2, 'resena', $3, $4, 'Por publicar una reseña')`,
      [datos.comensalId, PUNTOS_POR_RESENA, visita.restaurante_id, resenaId],
    )

    return { ok: true as const, id: resenaId, puntos: PUNTOS_POR_RESENA }
  })
}

export async function editarResena(datos: {
  id: number
  comensalId: number
  puntuacion: number
  comentario?: string
}): Promise<boolean> {
  return enTransaccion(async (cliente) => {
    const { rows } = await cliente.query<{ restaurante_id: number }>(
      `UPDATE resena
       SET    puntuacion = $3, comentario = $4, editada_en = now()
       WHERE  id = $1 AND comensal_id = $2 AND oculta_en IS NULL
       RETURNING restaurante_id`,
      [datos.id, datos.comensalId, datos.puntuacion, datos.comentario ?? null],
    )

    const fila = rows[0]
    if (!fila) return false

    await recalcular(cliente, fila.restaurante_id)
    return true
  })
}

/** Cuenta cuántas reseñas escribió el comensal. Va en su perfil. */
export async function cuantasResenas(comensalId: number): Promise<number> {
  const fila = await consultarUna<{ n: string }>(
    'SELECT count(*)::text AS n FROM resena WHERE comensal_id = $1 AND oculta_en IS NULL',
    [comensalId],
  )
  return Number(fila?.n ?? 0)
}
