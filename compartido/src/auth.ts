import { z } from 'zod'
import type { EstadoLegal } from './legal.js'

/** Niveles de acceso del comensal (Términos y Condiciones, art. 5). */
export type NivelAcceso = 'visitante' | 'registrado' | 'verificado'

/**
 * Mínimo de 10 caracteres: los T&C exigen que la contraseña sea personal e
 * intransferible y el Anexo Técnico declara bcrypt costo 12; un mínimo corto
 * dejaría sin efecto las dos cosas.
 */
const contrasenaSchema = z
  .string()
  .min(10, 'La contraseña necesita al menos 10 caracteres')
  .max(200, 'Demasiado larga')

export const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'Poné tu nombre').max(120),
  email: z.string().trim().toLowerCase().email('Ese correo no parece válido').max(180),
  password: contrasenaSchema,
  /** T&C art. 3: no se admiten menores de 18 años. */
  mayorDeEdad: z.literal(true, {
    errorMap: () => ({ message: 'Tenés que declarar que sos mayor de 18 años' }),
  }),
})
export type Registro = z.infer<typeof registroSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(180),
  password: z.string().min(1).max(200),
})

export const telefonoSchema = z.object({
  telefono: z
    .string()
    .trim()
    .min(8, 'El teléfono es demasiado corto')
    .max(40)
    .regex(/^[\d\s+()-]+$/, 'Solo números, espacios y los signos + ( ) -'),
})

export const codigoSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, 'El código son 6 dígitos'),
})

export type ComensalPublico = {
  id: number
  nombre: string
  email: string
  emailVerificado: boolean
  telefono: string | null
  telefonoVerificado: boolean
  nivel: NivelAcceso
  legal: EstadoLegal
}

export type RespuestaSesion = {
  comensal: ComensalPublico
  accessToken: string
  /**
   * Solo en desarrollo: el código que se enviaría por correo o SMS.
   * En producción viaja por el canal correspondiente y nunca por la API.
   */
  codigoDemo?: string
}
