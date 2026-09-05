/**
 * Corredor de migraciones.
 *
 * Aplica en orden los archivos `infra/db/migrations/NNN_*.sql` que todavía no
 * se hayan aplicado, cada uno dentro de su propia transacción, y deja
 * constancia en la tabla `_migracion`.
 *
 *   npm run db:migrate            aplica lo pendiente
 *   npm run db:reset              borra el esquema y vuelve a aplicar todo
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { DIR_MIGRACIONES } from '../config.js'
import { cerrarPool, pool } from './pool.js'

const RESET = process.argv.includes('--reset')

async function archivosDeMigracion(): Promise<string[]> {
  const entradas = await readdir(DIR_MIGRACIONES)
  return entradas.filter((n) => n.endsWith('.sql')).sort((a, b) => a.localeCompare(b, 'en'))
}

async function main(): Promise<void> {
  const cliente = await pool.connect()

  try {
    if (RESET) {
      console.log('· Reiniciando el esquema public…')
      await cliente.query('DROP SCHEMA IF EXISTS public CASCADE')
      await cliente.query('CREATE SCHEMA public')
    }

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS _migracion (
        nombre      TEXT        PRIMARY KEY,
        hash        CHAR(64)    NOT NULL,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    const { rows: aplicadas } = await cliente.query<{ nombre: string; hash: string }>(
      'SELECT nombre, hash FROM _migracion',
    )
    const yaAplicada = new Map(aplicadas.map((f) => [f.nombre, f.hash]))

    const archivos = await archivosDeMigracion()
    if (archivos.length === 0) {
      console.log('No hay migraciones en infra/db/migrations.')
      return
    }

    let nuevas = 0

    for (const archivo of archivos) {
      const sql = await readFile(resolve(DIR_MIGRACIONES, archivo), 'utf8')
      const hash = createHash('sha256').update(sql).digest('hex')
      const nombre = basename(archivo)
      const previo = yaAplicada.get(nombre)

      if (previo) {
        if (previo !== hash) {
          throw new Error(
            `La migración ${nombre} cambió después de haberse aplicado. ` +
              'Una migración aplicada no se edita: creá una nueva.',
          )
        }
        continue
      }

      process.stdout.write(`· ${nombre} … `)
      try {
        await cliente.query('BEGIN')
        await cliente.query(sql)
        await cliente.query('INSERT INTO _migracion (nombre, hash) VALUES ($1, $2)', [nombre, hash])
        await cliente.query('COMMIT')
        console.log('ok')
        nuevas += 1
      } catch (error) {
        await cliente.query('ROLLBACK')
        console.log('falló')
        throw error
      }
    }

    console.log(
      nuevas === 0
        ? 'La base ya estaba al día.'
        : `Listo: ${nuevas} ${nuevas === 1 ? 'migración aplicada' : 'migraciones aplicadas'}.`,
    )
  } finally {
    cliente.release()
    await cerrarPool()
  }
}

main().catch((error: unknown) => {
  console.error('\nLa migración falló:\n', error instanceof Error ? error.message : error)
  process.exit(1)
})
