/**
 * Recorrido de la base de datos para la defensa: `npm run db:mostrar`
 *
 * Contesta las dos preguntas juntas, en orden:
 *   cómo la armamos  → las migraciones y el registro de cuándo se aplicó cada una
 *   dónde está       → el contenedor, el volumen y el archivo en el disco de Windows
 *   qué es           → el archivo binario de una tabla, y el mismo dato ya leído
 *
 * Se puede correr un paso por vez para no tirar una pared de texto:
 *   npm run db:mostrar 1     (solo el paso 1)
 *   npm run db:mostrar       (todos)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONTENEDOR = 'restoba-db'
const BASE = 'restoba'
const USUARIO = 'restoba'

const negrita = (t) => `\x1b[1m${t}\x1b[0m`
const gris = (t) => `\x1b[90m${t}\x1b[0m`
const vino = (t) => `\x1b[35m${t}\x1b[0m`
const verde = (t) => `\x1b[32m${t}\x1b[0m`

/** Corre un comando y devuelve su salida, sin romper si falla. */
function salida(comando, args) {
  const r = spawnSync(comando, args, { encoding: 'utf8', shell: true })
  return (r.stdout ?? '').trimEnd() || (r.stderr ?? '').trimEnd()
}

/** Una consulta contra la base, en formato de tabla. */
function consulta(sql) {
  return salida('docker', ['exec', CONTENEDOR, 'psql', '-U', USUARIO, '-d', BASE, '-c', `"${sql}"`])
}

/** Una consulta que devuelve un solo valor suelto. */
function valor(sql) {
  return salida('docker', ['exec', CONTENEDOR, 'psql', '-U', USUARIO, '-d', BASE, '-t', '-A', '-c', `"${sql}"`])
}

function titulo(n, texto) {
  console.log('')
  console.log(vino('─'.repeat(72)))
  console.log(vino(negrita(`  PASO ${n} · ${texto}`)))
  console.log(vino('─'.repeat(72)))
}

function decir(texto) {
  console.log(gris(`\n  ${texto}\n`))
}

function comando(texto) {
  console.log(verde(`  $ ${texto}`))
}

// ── Chequeo previo ──────────────────────────────────────────

if (!salida('docker', ['ps', '--filter', `name=${CONTENEDOR}`, '--format', '{{.Names}}']).includes(CONTENEDOR)) {
  console.error('\n\x1b[31m✗\x1b[0m La base no está corriendo.')
  console.error('  Abrí Docker Desktop y después corré:  npm run db:up\n')
  process.exit(1)
}

const pedido = process.argv[2] ? Number(process.argv[2]) : null
const toca = (n) => pedido === null || pedido === n

// ── 1. Cómo la armamos ──────────────────────────────────────

if (toca(1)) {
  titulo(1, 'CÓMO ARMAMOS LA BASE')
  decir('La base no se armó a clics: está escrita en ocho archivos SQL numerados.')
  comando('ls infra/db/migrations/')
  console.log(salida('ls', ['infra/db/migrations/']).split('\n').map((l) => `    ${l}`).join('\n'))

  decir('Y la base lleva su propio registro de cuál aplicó y cuándo. El hash es del\n  contenido del archivo: si alguien edita una migración ya aplicada, se detecta.')
  comando('SELECT nombre, hash, aplicada_en FROM _migracion;')
  console.log(consulta(
    "SELECT nombre, left(hash, 16) || '...' AS hash_sha256, aplicada_en::timestamp(0) FROM _migracion ORDER BY nombre",
  ))
  decir('Esas fechas son la historia real del proyecto: del 5 al 17 de septiembre.')
}

// ── 2. Dónde está ───────────────────────────────────────────

if (toca(2)) {
  titulo(2, 'DÓNDE ESTÁ, FÍSICAMENTE')

  decir('El contenedor que corre el motor:')
  comando('docker ps')
  console.log(salida('docker', ['ps', '--filter', `name=${CONTENEDOR}`, '--format',
    '"table {{.Names}}\\t{{.Image}}\\t{{.Status}}"']))

  decir('Los datos no viven en el contenedor: viven en un volumen, que le sobrevive.')
  comando('docker volume inspect infra_restoba_pgdata')
  console.log(`    Ruta: ${salida('docker', ['volume', 'inspect', 'infra_restoba_pgdata', '--format', "'{{.Mountpoint}}'"])}`)

  decir('Esa ruta está dentro de la máquina virtual de Docker, que para Windows\n  es un único archivo de disco virtual:')
  const vhdx = join(homedir(), 'AppData', 'Local', 'Docker', 'wsl', 'disk', 'docker_data.vhdx')
  if (existsSync(vhdx)) {
    const gb = (statSync(vhdx).size / 1024 ** 3).toFixed(2)
    console.log(`    ${vhdx}`)
    console.log(`    ${negrita(gb + ' GB')} en el disco de esta notebook  ${gris('← el lugar físico')}`)
  } else {
    console.log(gris('    (no se encontró el .vhdx: puede que Docker use otra ubicación)'))
  }

  decir('Y adentro, los archivos que escribe PostgreSQL:')
  comando('ls /var/lib/postgresql/data')
  console.log(salida('docker', ['exec', CONTENEDOR, 'sh', '-c',
    '"ls /var/lib/postgresql/data | head -8; echo; du -sh /var/lib/postgresql/data"'])
    .split('\n').map((l) => `    ${l}`).join('\n'))
}

// ── 3. Qué es una tabla, físicamente ────────────────────────

if (toca(3)) {
  titulo(3, 'QUÉ ES UNA TABLA, FÍSICAMENTE')

  const ruta = valor("SELECT pg_relation_filepath('restaurante')")
  decir('La tabla `restaurante` es un archivo sin nombre, identificado por un número:')
  comando("SELECT pg_relation_filepath('restaurante');")
  console.log(`    ${ruta}`)

  console.log('')
  console.log(salida('docker', ['exec', CONTENEDOR, 'ls', '-la', `/var/lib/postgresql/data/${ruta}`])
    .split('\n').map((l) => `    ${l}`).join('\n'))

  decir('8192 bytes son UNA PÁGINA: la unidad mínima con la que PostgreSQL lee y\n  escribe. Nunca lee «una fila», lee la página entera.')
  console.log(consulta(
    "SELECT current_setting('block_size') AS pagina, pg_relation_size('restaurante') AS bytes, " +
    "pg_relation_size('restaurante')/8192 AS paginas, (SELECT count(*) FROM restaurante) AS filas",
  ))

  decir('Así se ven esos bytes. Esto es lo FÍSICO: no hay filas ni columnas.')
  comando(`od -c /var/lib/postgresql/data/${ruta}`)
  console.log(salida('docker', ['exec', CONTENEDOR, 'sh', '-c',
    `"od -c /var/lib/postgresql/data/${ruta} | sed -n '1,3p;327,332p'"`])
    .split('\n').map((l) => `    ${l}`).join('\n'))

  decir('Y el mismo dato, leído por el nivel LÓGICO. Idéntica información,\n  otra manera de mirarla:')
  comando('SELECT id, nombre, barrio FROM restaurante WHERE id = 1;')
  console.log(consulta('SELECT id, nombre, barrio FROM restaurante WHERE id = 1'))
}

// ── 4. El puente entre las dos cosas ────────────────────────

if (toca(4)) {
  titulo(4, 'EL PUENTE: DE LA LÍNEA SQL AL ARCHIVO')

  decir('Esta es la línea que escribimos nosotros, en 002_restaurantes.sql:')
  console.log(salida('grep', ['-n', '-A', '3', '"CREATE TABLE restaurante"', 'infra/db/migrations/002_restaurantes.sql'])
    .split('\n').slice(0, 5).map((l) => `    ${l}`).join('\n'))

  const ruta = valor("SELECT pg_relation_filepath('restaurante')")
  decir('Y este es el archivo que esa línea creó en el disco:')
  console.log(`    /var/lib/postgresql/data/${ruta}`)

  decir('Ese es el recorrido completo: de una línea de texto que escribimos y que\n  está versionada en git, a un archivo binario en el disco de la notebook.')
}

console.log('')
if (pedido === null) {
  console.log(gris('  Para ir de a un paso:  npm run db:mostrar 1   (o 2, 3, 4)\n'))
}
