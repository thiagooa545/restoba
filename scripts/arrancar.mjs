/**
 * Arranque en un solo comando: `npm start`
 *
 * Levanta la base, espera a que esté lista, aplica las migraciones, siembra los
 * datos de ejemplo si la base está vacía y deja corriendo la API y la web.
 *
 * Pensado para máquinas donde el proyecto se abre por primera vez: nadie
 * debería tener que acordarse de cuatro comandos en orden.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENEDOR = 'restoba-db'

const gris = (t) => `[90m${t}[0m`
const verde = (t) => `[32m${t}[0m`
const rojo = (t) => `[31m${t}[0m`
const negrita = (t) => `[1m${t}[0m`

function correr(comando, args, { silencioso = false } = {}) {
  return spawnSync(comando, args, {
    cwd: RAIZ,
    shell: true,
    stdio: silencioso ? 'pipe' : 'inherit',
    encoding: 'utf8',
  })
}

function fallar(titulo, ...pistas) {
  console.error(`\n${rojo('✗')} ${negrita(titulo)}`)
  for (const pista of pistas) console.error(`  ${pista}`)
  console.error('')
  process.exit(1)
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 1. Requisitos ───────────────────────────────────────────

const mayorDeNode = Number(process.versions.node.split('.')[0])
if (mayorDeNode < 20) {
  fallar(
    `Node ${process.versions.node} es demasiado viejo.`,
    'Hace falta Node 20 o superior (recomendado: 22).',
    'Descargalo de https://nodejs.org',
  )
}

if (correr('docker', ['--version'], { silencioso: true }).status !== 0) {
  fallar(
    'No encontré Docker.',
    'La base de datos (PostgreSQL + PostGIS) corre en un contenedor.',
    'Instalá Docker Desktop desde https://www.docker.com/products/docker-desktop',
    'y asegurate de que esté abierto antes de correr esto.',
  )
}

if (correr('docker', ['info'], { silencioso: true }).status !== 0) {
  fallar(
    'Docker está instalado pero el motor no responde.',
    'Abrí Docker Desktop y esperá a que diga "Engine running".',
    'Después volvé a correr: npm start',
  )
}

if (!existsSync(resolve(RAIZ, 'node_modules'))) {
  fallar(
    'Faltan las dependencias.',
    'Corré primero:  npm install',
  )
}

// ── 2. Archivo .env ─────────────────────────────────────────

if (!existsSync(resolve(RAIZ, '.env'))) {
  console.log(gris('· No había .env, lo creo desde .env.example'))
  await copyFile(resolve(RAIZ, '.env.example'), resolve(RAIZ, '.env'))
}

// ── 3. Base de datos ────────────────────────────────────────

// Si la imagen no está descargada pero viajó en el pendrive, se carga de ahí.
// Es lo que permite arrancar sin internet en otra máquina.
const IMAGEN = 'postgis/postgis:16-3.4'
const tieneImagen =
  correr('docker', ['image', 'inspect', IMAGEN], { silencioso: true }).status === 0

if (!tieneImagen) {
  const tar = resolve(RAIZ, 'infra/postgis-16-3.4.tar')
  if (existsSync(tar)) {
    console.log(gris('· Cargando la imagen de PostGIS desde infra/ (sin internet)…'))
    correr('docker', ['load', '-i', `"${tar}"`])
  } else {
    console.log(gris('· Descargando la imagen de PostGIS (esto tarda la primera vez)…'))
  }
}

console.log(gris('· Levantando PostgreSQL + PostGIS…'))
if (correr('docker', ['compose', '-f', 'infra/docker-compose.yml', 'up', '-d']).status !== 0) {
  fallar('No pude levantar el contenedor de la base.')
}

process.stdout.write(gris('· Esperando a que la base acepte conexiones… '))
let lista = false
for (let intento = 0; intento < 60 && !lista; intento += 1) {
  const r = correr('docker', ['exec', CONTENEDOR, 'pg_isready', '-U', 'restoba', '-d', 'restoba'], {
    silencioso: true,
  })
  if (r.status === 0) lista = true
  else await esperar(2000)
}

if (!lista) {
  console.log('')
  fallar(
    'La base no respondió a tiempo.',
    'Mirá qué pasó con:  npm run db:logs',
  )
}
console.log(verde('lista'))

// La primera vez, PostgreSQL se reinicia al terminar de inicializarse y puede
// cortar la conexión justo en la primera migración. Por eso se reintenta.
console.log(gris('· Aplicando migraciones…'))
let migrado = correr('npm', ['run', '--silent', 'db:migrate']).status === 0
if (!migrado) {
  console.log(gris('  (reintento: la base terminó de inicializarse recién)'))
  await esperar(3000)
  migrado = correr('npm', ['run', '--silent', 'db:migrate']).status === 0
}
if (!migrado) fallar('Las migraciones fallaron.')

// ── 4. Datos de ejemplo, solo si hace falta ─────────────────

const cuenta = correr(
  'docker',
  [
    'exec', CONTENEDOR, 'psql', '-U', 'restoba', '-d', 'restoba', '-tAc',
    '"SELECT count(*) FROM restaurante"',
  ],
  { silencioso: true },
)

if (Number((cuenta.stdout ?? '0').trim()) === 0) {
  console.log(gris('· La base está vacía, cargando los datos de ejemplo…'))
  if (correr('npm', ['run', '--silent', 'db:seed']).status !== 0) {
    fallar('El sembrado falló.')
  }
} else {
  console.log(gris(`· Ya hay ${(cuenta.stdout ?? '').trim()} restaurantes cargados.`))
}

// ── 5. A correr ─────────────────────────────────────────────

console.log(`
${verde('Todo listo.')}  Abrí ${negrita('http://localhost:5173')}

  ${gris('El mapa y las tipografías necesitan internet.')}
  ${gris('Para cortar: Ctrl+C')}
`)

const dev = spawn('npm', ['run', 'dev'], { cwd: RAIZ, shell: true, stdio: 'inherit' })
dev.on('exit', (codigo) => process.exit(codigo ?? 0))
