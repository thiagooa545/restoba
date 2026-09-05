import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { rutasSalud } from './rutas/salud.js'

export function crearApp(): express.Express {
  const app = express()

  // Anexo Técnico secc. 6: cabeceras de seguridad, sin exponer la tecnología del servidor.
  app.disable('x-powered-by')
  app.use(helmet())

  // La web y la API viven en orígenes distintos en desarrollo.
  // credentials: true porque el refresh token viaja en una cookie httpOnly.
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }))

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use('/api', rutasSalud)

  // 404 en JSON, para que el frontend nunca reciba HTML donde espera datos.
  app.use((_req, res) => {
    res.status(404).json({ error: 'no_encontrado' })
  })

  return app
}
