import pg from 'pg'
import { config } from '../config.js'

/**
 * Pool único de conexiones. Todo el acceso a datos pasa por acá.
 *
 * Regla de aislamiento multiempresa (RF-12): ninguna consulta sobre tablas
 * operativas sale sin filtrar por restaurante_id. Se verifica con tests.
 */
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error)
})

/** Consulta simple con parámetros. Nunca concatenar valores en el SQL. */
export async function consultar<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  parametros: readonly unknown[] = [],
): Promise<T[]> {
  const resultado = await pool.query<T>(sql, parametros as unknown[])
  return resultado.rows
}

/** Devuelve la primera fila, o null si no hubo resultados. */
export async function consultarUna<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  parametros: readonly unknown[] = [],
): Promise<T | null> {
  const filas = await consultar<T>(sql, parametros)
  return filas[0] ?? null
}

/** Ejecuta el callback dentro de una transacción; revierte ante cualquier error. */
export async function enTransaccion<T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await fn(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

export async function cerrarPool(): Promise<void> {
  await pool.end()
}
