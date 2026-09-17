import { z } from 'zod'

/**
 * Los tres roles del personal, del apartado 9 del documento de análisis.
 * El orden importa: va de más permisos a menos.
 */
export const ROLES = ['admin', 'mozo', 'cocina'] as const
export type Rol = (typeof ROLES)[number]

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  mozo: 'Mozo',
  cocina: 'Cocina',
}

/**
 * Qué puede hacer cada rol. Sale de la tabla de actores del documento:
 * el administrador gestiona y ve reportes, el mozo toma pedidos y cobra,
 * la cocina solo mira el tablero y cambia estados.
 */
export const PERMISOS_ROL: Record<Rol, readonly string[]> = {
  admin: ['perfil', 'carta', 'mesas', 'stock', 'empleados', 'pedidos', 'cocina', 'ventas', 'reportes', 'suscripcion'],
  mozo: ['mesas', 'pedidos', 'cobrar'],
  cocina: ['cocina'],
}

export function rolPuede(rol: Rol, permiso: string): boolean {
  return PERMISOS_ROL[rol].includes(permiso)
}

export const loginStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ese correo no parece válido').max(180),
  password: z.string().min(1, 'Poné tu contraseña').max(200),
})

export const nuevoUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'Poné el nombre').max(120),
  email: z.string().trim().toLowerCase().email('Ese correo no parece válido').max(180),
  password: z.string().min(10, 'La contraseña necesita al menos 10 caracteres').max(200),
  rol: z.enum(ROLES),
})

export type UsuarioStaff = {
  id: number
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  restauranteId: number
  restaurante: string
  /** Estado de la suscripción del local: decide si aparece en el buscador. */
  suscripcion: EstadoSuscripcion
}

export type RespuestaSesionStaff = {
  usuario: UsuarioStaff
  accessToken: string
}

export const ESTADOS_SUSCRIPCION = [
  'activa',
  'pendiente_acreditacion',
  'vencida',
  'cancelada',
] as const
export type EstadoSuscripcion = (typeof ESTADOS_SUSCRIPCION)[number]

export const NOMBRE_SUSCRIPCION: Record<EstadoSuscripcion, string> = {
  activa: 'Activa',
  pendiente_acreditacion: 'Pendiente de acreditación',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

/** Solo un local con la suscripción activa aparece en el buscador. */
export function apareceEnBuscador(estado: EstadoSuscripcion): boolean {
  return estado === 'activa'
}
