import { z } from 'zod'

/**
 * Roles del personal de un restaurante (tabla `usuario`, siempre con restaurante_id).
 * El comensal vive en su propia tabla `comensal` y es global: no pertenece a ningún local.
 */
export const ROLES_STAFF = ['admin', 'mozo', 'cocina'] as const
export type RolStaff = (typeof ROLES_STAFF)[number]
export const rolStaffSchema = z.enum(ROLES_STAFF)

/**
 * Niveles de acceso del comensal (Términos y Condiciones, art. 5).
 * El nivel decide qué puede hacer, no quién es.
 */
export const NIVELES_ACCESO = ['visitante', 'registrado', 'verificado'] as const
export type NivelAcceso = (typeof NIVELES_ACCESO)[number]

/**
 * Matriz de permisos del artículo 5 de los T&C, tal cual está en la tabla del documento.
 * Es la única fuente de verdad del gate: la API y la web leen de acá.
 */
export const PERMISOS: Record<NivelAcceso, readonly string[]> = {
  visitante: ['buscar', 'ver_perfil', 'ver_menu', 'leer_resenas'],
  registrado: ['buscar', 'ver_perfil', 'ver_menu', 'leer_resenas', 'guardar_favoritos'],
  verificado: [
    'buscar',
    'ver_perfil',
    'ver_menu',
    'leer_resenas',
    'guardar_favoritos',
    'reservar',
    'resenar',
    'acumular_puntos',
    'canjear_cupones',
  ],
} as const

export type Permiso = (typeof PERMISOS)['verificado'][number]

export function puede(nivel: NivelAcceso, permiso: Permiso): boolean {
  return PERMISOS[nivel].includes(permiso)
}

/**
 * Estados de un pedido en el tablero de cocina (Fase B).
 * El orden del array es el orden de las columnas del Kanban.
 */
export const ESTADOS_PEDIDO = ['pendiente', 'en_preparacion', 'listo', 'entregado'] as const
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]

/** Estados de una mesa. */
export const ESTADOS_MESA = ['libre', 'ocupada', 'reservada'] as const
export type EstadoMesa = (typeof ESTADOS_MESA)[number]

/**
 * Estado de la suscripción del restaurante.
 * Se cobra por transferencia bancaria directa, fuera de la plataforma (T&C art. 10):
 * `pendiente_acreditacion` es el período con comprobante cargado y todavía sin confirmar.
 */
export const ESTADOS_SUSCRIPCION = [
  'activa',
  'pendiente_acreditacion',
  'vencida',
  'cancelada',
] as const
export type EstadoSuscripcion = (typeof ESTADOS_SUSCRIPCION)[number]

/** Solo un restaurante con suscripción activa aparece en el buscador. */
export function apareceEnBuscador(estado: EstadoSuscripcion): boolean {
  return estado === 'activa'
}
