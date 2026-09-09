import { Router } from 'express'
import { consultarUna } from '../db/pool.js'

export const rutasSalud = Router()

/**
 * Chequeo de vida. Confirma que la API responde y que PostGIS está disponible,
 * que es la pieza de la que depende toda la búsqueda por cercanía.
 */
rutasSalud.get('/salud', async (_req, res) => {
  try {
    const fila = await consultarUna<{ postgis: string; postgres: string }>(
      "SELECT postgis_lib_version() AS postgis, current_setting('server_version') AS postgres",
    )

    res.json({
      ok: true,
      servicio: 'restoba-api',
      base: 'conectada',
      postgres: fila?.postgres ?? null,
      postgis: fila?.postgis ?? null,
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      servicio: 'restoba-api',
      base: 'sin conexión',
      detalle: error instanceof Error ? error.message : 'error desconocido',
    })
  }
})
