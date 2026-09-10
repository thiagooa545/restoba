import {
  CATALOGO_CUPONES,
  MESES_VIGENCIA_CUPON,
  PUNTOS_POR_VISITA,
  type ClaveCupon,
  type Cupon,
  type EstadoPuntos,
  type MovimientoPuntos,
} from '@restoba/compartido'
import { randomBytes } from 'node:crypto'
import { consultar, consultarUna, enTransaccion } from './pool.js'

const TZ = 'America/Argentina/Buenos_Aires'

// ── Favoritos (T&C art. 5: distingue al Usuario Registrado) ──

export async function alternarFavorito(
  comensalId: number,
  restauranteId: number,
): Promise<boolean> {
  const borradas = await consultar<{ restaurante_id: number }>(
    'DELETE FROM favorito WHERE comensal_id = $1 AND restaurante_id = $2 RETURNING restaurante_id',
    [comensalId, restauranteId],
  )

  if (borradas.length > 0) return false

  await consultar(
    'INSERT INTO favorito (comensal_id, restaurante_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [comensalId, restauranteId],
  )
  return true
}

export async function esFavorito(comensalId: number, restauranteId: number): Promise<boolean> {
  const fila = await consultarUna<{ existe: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM favorito WHERE comensal_id = $1 AND restaurante_id = $2) AS existe',
    [comensalId, restauranteId],
  )
  return fila?.existe ?? false
}

export function idsFavoritos(comensalId: number): Promise<{ restaurante_id: number }[]> {
  return consultar<{ restaurante_id: number }>(
    'SELECT restaurante_id FROM favorito WHERE comensal_id = $1',
    [comensalId],
  )
}

// ── Puntos ──────────────────────────────────────────────────

/**
 * Acredita los puntos de las visitas ya ocurridas que todavía no se liquidaron,
 * y marca esas reservas como cumplidas.
 *
 * No hay tarea programada: se liquida cuando el comensal mira sus puntos o sus
 * reservas. El índice único sobre (reserva_id) para el motivo 'visita' hace que
 * correrlo mil veces acredite una sola.
 */
export async function liquidarVisitas(comensalId: number): Promise<number> {
  return enTransaccion(async (cliente) => {
    const { rows } = await cliente.query<{ id: number; restaurante_id: number }>(
      `SELECT rv.id, rv.restaurante_id
       FROM   reserva rv
       LEFT JOIN movimiento_puntos mp
              ON mp.reserva_id = rv.id AND mp.motivo = 'visita'
       WHERE  rv.comensal_id = $1
         AND  rv.estado IN ('confirmada', 'cumplida')
         AND  (rv.fecha + rv.hora) <= (now() AT TIME ZONE '${TZ}')
         AND  mp.id IS NULL
       FOR UPDATE OF rv`,
      [comensalId],
    )

    for (const r of rows) {
      await cliente.query(
        `INSERT INTO movimiento_puntos (comensal_id, puntos, motivo, restaurante_id, reserva_id, detalle)
         VALUES ($1, $2, 'visita', $3, $4, 'Por completar una visita')
         ON CONFLICT DO NOTHING`,
        [comensalId, PUNTOS_POR_VISITA, r.restaurante_id, r.id],
      )
      await cliente.query(`UPDATE reserva SET estado = 'cumplida' WHERE id = $1`, [r.id])
    }

    return rows.length
  })
}

export async function saldoDe(comensalId: number): Promise<number> {
  const fila = await consultarUna<{ saldo: string }>(
    'SELECT COALESCE(sum(puntos), 0)::text AS saldo FROM movimiento_puntos WHERE comensal_id = $1',
    [comensalId],
  )
  return Number(fila?.saldo ?? 0)
}

export async function estadoPuntos(comensalId: number): Promise<EstadoPuntos> {
  await liquidarVisitas(comensalId)

  const movimientos = await consultar<MovimientoPuntos & { puntos: string }>(
    `SELECT mp.id, mp.puntos::text AS puntos, mp.motivo, mp.detalle,
            r.nombre AS restaurante,
            mp.creado_en::text AS fecha
     FROM   movimiento_puntos mp
     LEFT JOIN restaurante r ON r.id = mp.restaurante_id
     WHERE  mp.comensal_id = $1
     ORDER BY mp.creado_en DESC
     LIMIT  50`,
    [comensalId],
  )

  const cupones = await consultar<{
    id: number
    codigo: string
    titulo: string
    puntos_gastados: number
    vence_en: string
    usado_en: string | null
    vencido: boolean
  }>(
    `SELECT id, codigo, titulo, puntos_gastados,
            to_char(vence_en, 'YYYY-MM-DD') AS vence_en,
            usado_en::text AS usado_en,
            (vence_en < (now() AT TIME ZONE '${TZ}')::date) AS vencido
     FROM   cupon
     WHERE  comensal_id = $1
     ORDER BY creado_en DESC`,
    [comensalId],
  )

  const saldo = await saldoDe(comensalId)

  const acumulado = await consultarUna<{ total: string }>(
    `SELECT COALESCE(sum(puntos), 0)::text AS total
     FROM   movimiento_puntos
     WHERE  comensal_id = $1 AND puntos > 0`,
    [comensalId],
  )

  return {
    saldo,
    acumuladoHistorico: Number(acumulado?.total ?? 0),
    movimientos: movimientos.map((m) => ({ ...m, puntos: Number(m.puntos) })),
    cupones: cupones.map(
      (c): Cupon => ({
        id: c.id,
        codigo: c.codigo,
        titulo: c.titulo,
        puntosGastados: c.puntos_gastados,
        venceEn: c.vence_en,
        usado: c.usado_en !== null,
        vencido: c.vencido,
      }),
    ),
    catalogo: CATALOGO_CUPONES.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      puntos: c.puntos,
      alcanza: saldo >= c.puntos,
    })),
  }
}

type ResultadoCanje = { ok: true; cupon: Cupon } | { ok: false; motivo: 'saldo_insuficiente' }

/** Código legible, sin caracteres que se confundan al dictarlo. */
function generarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  return (
    'RB-' +
    Array.from(bytes.subarray(0, 6))
      .map((b) => alfabeto[b % alfabeto.length])
      .join('')
  )
}

/**
 * Canje de Puntos por un Cupón. El art. 8 dice que es irreversible y que los
 * Puntos no se devuelven, así que el gasto y el cupón nacen en la misma
 * transacción: o quedan los dos, o no queda ninguno.
 */
export async function canjear(comensalId: number, clave: ClaveCupon): Promise<ResultadoCanje> {
  const item = CATALOGO_CUPONES.find((c) => c.id === clave)
  if (!item) return { ok: false, motivo: 'saldo_insuficiente' }

  return enTransaccion(async (cliente) => {
    // Se bloquea la fila del comensal antes de leer el saldo: dos canjes
    // simultáneos quedan en fila y no pueden gastar los mismos puntos.
    // El bloqueo va sobre `comensal` y no sobre la suma de movimientos porque
    // PostgreSQL no admite FOR UPDATE junto con funciones de agregación.
    await cliente.query('SELECT id FROM comensal WHERE id = $1 FOR UPDATE', [comensalId])

    const { rows: saldoFilas } = await cliente.query<{ saldo: string }>(
      `SELECT COALESCE(sum(puntos), 0)::text AS saldo
       FROM   movimiento_puntos
       WHERE  comensal_id = $1`,
      [comensalId],
    )

    const saldo = Number(saldoFilas[0]?.saldo ?? 0)
    if (saldo < item.puntos) return { ok: false as const, motivo: 'saldo_insuficiente' as const }

    const { rows: cuponFilas } = await cliente.query<{
      id: number
      codigo: string
      vence_en: string
    }>(
      `INSERT INTO cupon (comensal_id, codigo, titulo, puntos_gastados, vence_en)
       VALUES ($1, $2, $3, $4, (now() AT TIME ZONE '${TZ}')::date + make_interval(months => $5))
       RETURNING id, codigo, to_char(vence_en, 'YYYY-MM-DD') AS vence_en`,
      [comensalId, generarCodigo(), item.titulo, item.puntos, MESES_VIGENCIA_CUPON],
    )
    const nuevo = cuponFilas[0]!

    await cliente.query(
      `INSERT INTO movimiento_puntos (comensal_id, puntos, motivo, cupon_id, detalle)
       VALUES ($1, $2, 'canje', $3, $4)`,
      [comensalId, -item.puntos, nuevo.id, item.titulo],
    )

    return {
      ok: true as const,
      cupon: {
        id: nuevo.id,
        codigo: nuevo.codigo,
        titulo: item.titulo,
        puntosGastados: item.puntos,
        venceEn: nuevo.vence_en,
        usado: false,
        vencido: false,
      },
    }
  })
}
