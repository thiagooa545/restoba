/** Corredor de migraciones. */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { DIR_MIGRACIONES } from '../config.js'
import { cerrarPool, pool } from './pool.js'

const RESET = process.argv.includes('--reset')

/**
 * Vuelve a guardar la huella de las migraciones ya aplicadas, sin ejecutarlas.
 * Se usa una sola vez, cuando se documenta una migración vieja y la huella
 * guardada quedó vieja. No toca la base: solo el registro.
 */
const RECALCULAR = process.argv.includes('--recalcular')

/**
 * La huella se calcula sobre el SQL que se ejecuta, no sobre el archivo entero:
 * se sacan los comentarios y se normalizan los espacios.
 *
 * Por qué: documentar una migración ya aplicada no cambia nada de lo que la
 * base hizo, así que no debería disparar la alarma. Lo que sí tiene que
 * detectarse es un cambio en una instrucción, y eso sigue detectándose.
 */
function normalizar(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function huella(sql: string): string {
  return createHash('sha256').update(normalizar(sql)).digest('hex')
}

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
      const hash = huella(sql)
      const nombre = basename(archivo)
      const previo = yaAplicada.get(nombre)

      if (previo) {
        if (previo !== hash && RECALCULAR) {
          await cliente.query('UPDATE _migracion SET hash = $2 WHERE nombre = $1', [nombre, hash])
          console.log(`· ${nombre} … huella actualizada`)
          continue
        }

        if (previo !== hash) {
          // Puede ser que la huella guardada sea de la versión vieja del cálculo,
          // que incluía los comentarios. Si el SQL ejecutable es el mismo, se
          // actualiza en silencio; si cambió de verdad, se corta.
          const comoAntes = createHash('sha256').update(sql).digest('hex')
          if (previo === comoAntes) {
            await cliente.query('UPDATE _migracion SET hash = $2 WHERE nombre = $1', [nombre, hash])
          } else {
            throw new Error(
              `La migración ${nombre} cambió después de haberse aplicado.\n` +
                '  Una migración aplicada no se edita: creá una nueva.\n' +
                '  Si solo agregaste comentarios, corré:  npm run db:migrate -- --recalcular',
            )
          }
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
  const codigo = (error as { code?: string } | null)?.code
  if (codigo === 'ECONNREFUSED' || codigo === 'ENOTFOUND') {
    console.error(
      '\nLa base no responde en la dirección de DATABASE_URL.' +
        '\nLevantala con:  npm run db:up' +
        '\n(y revisá que Docker Desktop esté abierto)\n',
    )
    process.exit(1)
  }

  const detalle = error instanceof Error && error.message ? error.message : String(error)
  console.error(`\nLa migración falló:\n  ${detalle}\n`)
  process.exit(1)
})
