import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { rutasAuth } from './rutas/auth.js'
import { rutasLegal } from './rutas/legal.js'
import { rutasRestaurantes } from './rutas/restaurantes.js'
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

  // Detrás de un proxy (Vite en desarrollo, el hosting en producción) es lo
  // que hace que req.ip sea la IP del usuario y no la del proxy. La constancia
  // de aceptación la registra, así que tiene que ser la verdadera.
  app.set('trust proxy', 1)

  app.use('/api', rutasSalud)
  app.use('/api', rutasRestaurantes)
  app.use('/api', rutasAuth)
  app.use('/api', rutasLegal)

  // 404 en JSON, para que el frontend nunca reciba HTML donde espera datos.
  app.use((_req, res) => {
    res.status(404).json({ error: 'no_encontrado' })
  })

  return app
}
