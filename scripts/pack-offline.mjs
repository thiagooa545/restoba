/**
 * Prepara el proyecto para llevarlo en un pendrive y correrlo sin internet.
 *
 *   npm run pack:offline
 *
 * Deja en infra/ la imagen de PostGIS exportada como archivo. En la otra
 * máquina, `npm start` la carga sola si no la encuentra descargada.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGEN = 'postgis/postgis:16-3.4'
const DESTINO = resolve(RAIZ, 'infra/postgis-16-3.4.tar')

const gris = (t) => `[90m${t}[0m`
const verde = (t) => `[32m${t}[0m`
const rojo = (t) => `[31m${t}[0m`

function correr(cmd, args, opciones = {}) {
  return spawnSync(cmd, args, { cwd: RAIZ, shell: true, stdio: 'inherit', ...opciones })
}

if (correr('docker', ['info'], { stdio: 'pipe' }).status !== 0) {
  console.error(`\n${rojo('✗')} Docker no está corriendo. Abrí Docker Desktop y probá de nuevo.\n`)
  process.exit(1)
}

console.log(gris(`· Asegurando que la imagen ${IMAGEN} esté descargada…`))
if (correr('docker', ['pull', IMAGEN]).status !== 0) {
  console.error(`\n${rojo('✗')} No pude descargar la imagen.\n`)
  process.exit(1)
}

console.log(gris(`· Exportando a ${DESTINO}…`))
if (correr('docker', ['save', '-o', `"${DESTINO}"`, IMAGEN]).status !== 0) {
  console.error(`\n${rojo('✗')} Falló la exportación.\n`)
  process.exit(1)
}

const mb = (statSync(DESTINO).size / 1024 / 1024).toFixed(0)
const conModulos = existsSync(resolve(RAIZ, 'node_modules'))

console.log(`
${verde('Listo.')}  infra/postgis-16-3.4.tar  (${mb} MB)

Para llevarlo en el pendrive, copiá la carpeta ENTERA del proyecto,
${conModulos ? 'incluida node_modules' : `${rojo('pero antes corré npm install')}: falta node_modules`}.

En la otra máquina: ${verde('npm start')}
`)
