import type { NextFunction, Request, Response } from 'express'
import { estadoLegal, porId, type FilaComensal } from '../db/comensales.js'
import { leerAcceso } from '../seguridad.js'

declare module 'express-serve-static-core' {
  interface Request {
    comensal?: FilaComensal
  }
}

function tokenDe(req: Request): string | null {
  const cabecera = req.headers.authorization
  if (!cabecera?.startsWith('Bearer ')) return null
  return cabecera.slice(7).trim() || null
}

/**
 * Deja pasar sin sesión, pero si hay un token válido carga el comensal.
 * Lo usan las pantallas públicas que cambian algo cuando hay alguien detrás:
 * las reseñas marcan cuál es la tuya, el perfil marca si está en favoritos.
 */
export async function conSesionOpcional(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = tokenDe(req)
  const datos = token ? leerAcceso(token) : null
  if (datos) {
    const fila = await porId(datos.sub)
    if (fila) req.comensal = fila
  }
  next()
}

/** Exige sesión iniciada. */
export async function requiereSesion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = tokenDe(req)
  const datos = token ? leerAcceso(token) : null

  if (!datos) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  const fila = await porId(datos.sub)
  if (!fila) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  req.comensal = fila
  next()
}

/**
 * Exige nivel de Usuario Verificado (T&C art. 5).
 *
 * Reservar, reseñar y acumular puntos pasan por acá. La respuesta explica qué
 * falta, porque el usuario tiene derecho a saber por qué no puede.
 */
export async function requiereVerificado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const fila = req.comensal
  if (!fila) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  const legal = await estadoLegal(fila.id, fila.email_verificado, fila.telefono_verificado)

  if (!legal.verificado) {
    res.status(403).json({
      error: 'verificacion_requerida',
      mensaje:
        'Esta acción necesita una cuenta verificada: correo y teléfono confirmados, ' +
        'y los tres documentos del marco legal aceptados.',
      legal,
    })
    return
  }

  next()
}
