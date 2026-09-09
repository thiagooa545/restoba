import { crearApp } from './app.js'
import { config } from './config.js'
import { cerrarPool } from './db/pool.js'

const app = crearApp()

const servidor = app.listen(config.API_PORT, () => {
  console.log(`API de RestoBA escuchando en http://localhost:${config.API_PORT}`)
  console.log(`Chequeo: http://localhost:${config.API_PORT}/api/salud`)
})

async function apagar(senal: string): Promise<void> {
  console.log(`\n${senal} recibido, cerrando…`)
  servidor.close(() => {
    void cerrarPool().then(() => process.exit(0))
  })
}

process.on('SIGINT', () => void apagar('SIGINT'))
process.on('SIGTERM', () => void apagar('SIGTERM'))
