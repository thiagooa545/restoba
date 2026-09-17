/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El control de acceso del panel del restaurante. Es el equivalente de
   middleware/auth.ts, pero para el personal del local en vez del comensal.

   Tres filtros, del más flojo al más estricto:

     requiereStaff       → hay que ser personal de algún local.
     requiereRol(...)    → hay que tener uno de los roles indicados.
                           El mozo no entra a inventario; la cocina solo
                           al tablero.
     requiereSuscripcion → además, el local tiene que estar al día.

   El tercero es el modelo de negocio aplicado: si el restaurante dejó de
   pagar, puede entrar a ver su cuenta y regularizar, pero no sigue
   operando. Es lo mismo que decir que un local impago no aparece en el
   buscador, visto desde el otro lado.

   La pieza que hace posible el aislamiento multiempresa (RF-12) es una
   sola línea: el restaurante sale del usuario que inició sesión, NUNCA
   de lo que manda el navegador. Por eso nadie puede ver datos de otro
   local cambiando un número en la dirección.

   Responde a: RF-08, RF-12 y Términos y Condiciones arts. 5 y 10.
   ════════════════════════════════════════════════════════════════════ */

import type { Rol } from '@restoba/compartido'
import type { NextFunction, Request, Response } from 'express'
import { porIdStaff, type FilaUsuario } from '../db/usuarios.js'
import { leerAccesoStaff } from '../seguridad.js'

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: FilaUsuario
  }
}

function tokenDe(req: Request): string | null {
  const cabecera = req.headers.authorization
  if (!cabecera?.startsWith('Bearer ')) return null
  return cabecera.slice(7).trim() || null
}

export async function requiereStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = tokenDe(req)
  const datos = token ? leerAccesoStaff(token) : null

  if (!datos) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  const fila = await porIdStaff(datos.sub)
  if (!fila) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  req.usuario = fila
  next()
}

/** Exige uno de los roles indicados. Se usa como requiereRol('admin'). */
export function requiereRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.usuario
    if (!usuario) {
      res.status(401).json({ error: 'sesion_requerida' })
      return
    }

    if (!roles.includes(usuario.rol)) {
      res.status(403).json({
        error: 'rol_insuficiente',
        mensaje: `Esta sección es para ${roles.join(' o ')}. Tu cuenta es de ${usuario.rol}.`,
      })
      return
    }

    next()
  }
}

/**
 * Exige que el local esté al día con la suscripción.
 *
 * No se aplica a las pantallas de cuenta y facturación: ahí justamente
 * tiene que poder entrar para regularizar. Dejarlo afuera de todo sería
 * encerrarlo sin salida.
 */
export function requiereSuscripcion(req: Request, res: Response, next: NextFunction): void {
  const usuario = req.usuario
  if (!usuario) {
    res.status(401).json({ error: 'sesion_requerida' })
    return
  }

  if (usuario.suscripcion !== 'activa') {
    res.status(402).json({
      error: 'suscripcion_inactiva',
      mensaje:
        'La suscripción del local no está activa, así que el panel queda en modo lectura. ' +
        'Regularizala desde la sección de suscripción.',
      suscripcion: usuario.suscripcion,
    })
    return
  }

  next()
}
