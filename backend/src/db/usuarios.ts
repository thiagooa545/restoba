/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Las consultas del personal del restaurante. Es la puerta de entrada
   al aislamiento multiempresa (RF-12).

   Fijarse en que TODAS las funciones de acá reciben el restaurante_id
   además del dato que buscan. No es redundante: es la garantía de que
   un administrador nunca puede pedir un empleado, una mesa o un pedido
   de otro local, ni cambiando el número en la dirección del navegador.

   El patrón se repite en todo el panel: el middleware saca el
   restaurante del usuario que inició sesión, y la consulta filtra por
   ese valor. Nunca se toma el restaurante de lo que manda el navegador.

   Responde a: RF-08 y RF-12.
   ════════════════════════════════════════════════════════════════════ */

import type { EstadoSuscripcion, Rol, UsuarioStaff } from '@restoba/compartido'
import { consultar, consultarUna } from './pool.js'

export type FilaUsuario = {
  id: number
  restaurante_id: number
  nombre: string
  email: string
  password_hash: string
  rol: Rol
  activo: boolean
  restaurante: string
  suscripcion: EstadoSuscripcion
}

const CAMPOS = `u.id, u.restaurante_id, u.nombre, u.email, u.password_hash, u.rol, u.activo,
                r.nombre AS restaurante, r.estado AS suscripcion`

export function porEmailStaff(email: string): Promise<FilaUsuario | null> {
  return consultarUna<FilaUsuario>(
    `SELECT ${CAMPOS}
     FROM   usuario u
     JOIN   restaurante r ON r.id = u.restaurante_id
     WHERE  u.email = $1 AND u.activo = true`,
    [email.toLowerCase()],
  )
}

export function porIdStaff(id: number): Promise<FilaUsuario | null> {
  return consultarUna<FilaUsuario>(
    `SELECT ${CAMPOS}
     FROM   usuario u
     JOIN   restaurante r ON r.id = u.restaurante_id
     WHERE  u.id = $1 AND u.activo = true`,
    [id],
  )
}

export function aUsuarioPublico(fila: FilaUsuario): UsuarioStaff {
  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    activo: fila.activo,
    restauranteId: fila.restaurante_id,
    restaurante: fila.restaurante,
    suscripcion: fila.suscripcion,
  }
}

// ── Empleados del local ─────────────────────────────────────

export function listarEmpleados(restauranteId: number): Promise<UsuarioStaff[]> {
  return consultar<FilaUsuario>(
    `SELECT ${CAMPOS}
     FROM   usuario u
     JOIN   restaurante r ON r.id = u.restaurante_id
     WHERE  u.restaurante_id = $1
     ORDER BY u.rol, u.nombre`,
    [restauranteId],
  ).then((filas) => filas.map(aUsuarioPublico))
}

export async function crearEmpleado(datos: {
  restauranteId: number
  nombre: string
  email: string
  passwordHash: string
  rol: Rol
}): Promise<UsuarioStaff> {
  const fila = await consultarUna<{ id: number }>(
    `INSERT INTO usuario (restaurante_id, nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [datos.restauranteId, datos.nombre, datos.email.toLowerCase(), datos.passwordHash, datos.rol],
  )
  if (!fila) throw new Error('No se pudo crear el empleado')

  const creado = await porIdStaff(fila.id)
  if (!creado) throw new Error('No se pudo leer el empleado recién creado')
  return aUsuarioPublico(creado)
}

/**
 * Da de baja a un empleado. El restaurante_id va en el WHERE aunque el id
 * de usuario ya sea único: si no estuviera, un administrador podría dar de
 * baja al empleado de otro local mandando su número.
 */
export async function desactivarEmpleado(id: number, restauranteId: number): Promise<boolean> {
  const filas = await consultar<{ id: number }>(
    `UPDATE usuario SET activo = false
     WHERE id = $1 AND restaurante_id = $2 AND activo = true
     RETURNING id`,
    [id, restauranteId],
  )
  return filas.length > 0
}

// ── Sesiones del personal ───────────────────────────────────

export async function abrirSesionStaff(datos: {
  usuarioId: number
  expiraEn: Date
  ip: string | null
  userAgent: string | null
}): Promise<string> {
  const fila = await consultarUna<{ id: string }>(
    `INSERT INTO sesion_staff (usuario_id, expira_en, ip, user_agent)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [datos.usuarioId, datos.expiraEn, datos.ip, datos.userAgent],
  )
  if (!fila) throw new Error('No se pudo abrir la sesión')
  return fila.id
}

export function sesionStaffVigente(id: string, usuarioId: number): Promise<{ id: string } | null> {
  return consultarUna<{ id: string }>(
    `SELECT id FROM sesion_staff
     WHERE id = $1 AND usuario_id = $2 AND revocada_en IS NULL AND expira_en > now()`,
    [id, usuarioId],
  )
}

export async function revocarSesionStaff(id: string): Promise<void> {
  await consultar(
    'UPDATE sesion_staff SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL',
    [id],
  )
}
