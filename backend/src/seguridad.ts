/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Todo lo que protege los datos del usuario.

   Lo importante de este archivo: estos valores NO los elegimos por gusto. Están
   declarados en un documento legal, el Anexo Técnico de Seguridad, que forma
   parte del marco legal del proyecto.

     · Contraseñas con bcrypt de costo 12. Nunca se guarda la contraseña: se
       guarda un resultado del que no se puede volver atrás. Aunque alguien robara
       la base entera, no obtiene las contraseñas.

     · Sesión de 15 minutos. Si a alguien le roban el token, le sirve poco tiempo.

     · Teléfono cifrado con AES-256. Del servidor nunca sale el número completo:
       solo los últimos cuatro dígitos.

   Si mañana cambiamos uno de estos valores, hay que corregir el documento. No
   puede haber contradicción entre lo que el anexo promete y lo que el sistema
   hace: eso es aseguramiento de calidad aplicado.

   Responde a: RNF-04 y Anexo Técnico de Seguridad, secciones 3, 4 y 5.
   ════════════════════════════════════════════════════════════════════ */

/**
 * Primitivas de seguridad.
 *
 * Los parámetros de este archivo están declarados en un documento legal
 * (legal/04-anexo-tecnico-seguridad.md). Si alguno cambia, hay que corregir
 * también el documento: no es una decisión que se pueda tomar solo acá.
 */
import bcrypt from 'bcryptjs'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from './config.js'

// ── Contraseñas (Anexo Técnico, secc. 3) ────────────────────

export function hashearContrasena(texto: string): Promise<string> {
  return bcrypt.hash(texto, config.BCRYPT_ROUNDS)
}

export function verificarContrasena(texto: string, hash: string): Promise<boolean> {
  return bcrypt.compare(texto, hash)
}

// ── Teléfono cifrado (Anexo Técnico, secc. 5) ───────────────

const ALGORITMO = 'aes-256-gcm'

function clave(): Buffer {
  if (!config.TELEFONO_ENC_KEY) {
    throw new Error(
      'Falta TELEFONO_ENC_KEY en el .env. Generala con:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  return Buffer.from(config.TELEFONO_ENC_KEY, 'hex')
}

/** Devuelve `iv:tag:cifrado`, todo en hexadecimal. */
export function cifrarTelefono(telefono: string): string {
  const iv = randomBytes(12)
  const cifrador = createCipheriv(ALGORITMO, clave(), iv)
  const cifrado = Buffer.concat([cifrador.update(telefono, 'utf8'), cifrador.final()])
  return [iv.toString('hex'), cifrador.getAuthTag().toString('hex'), cifrado.toString('hex')].join(':')
}

function descifrarTelefono(guardado: string): string {
  const [ivHex, tagHex, datoHex] = guardado.split(':')
  if (!ivHex || !tagHex || !datoHex) throw new Error('Teléfono cifrado con formato inválido')

  const descifrador = createDecipheriv(ALGORITMO, clave(), Buffer.from(ivHex, 'hex'))
  descifrador.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([
    descifrador.update(Buffer.from(datoHex, 'hex')),
    descifrador.final(),
  ]).toString('utf8')
}

/** Últimos cuatro dígitos, para mostrar sin exponer el número. */
export function telefonoEnmascarado(guardado: string): string {
  const numero = descifrarTelefono(guardado).replace(/\D/g, '')
  return `••• ••• ${numero.slice(-4)}`
}

// ── Tokens (Anexo Técnico, secc. 4) ─────────────────────────

/**
 * Hay dos mundos de sesión que no se pueden mezclar: el comensal que busca
 * restaurantes y el personal que trabaja en uno. El campo `tipo` marca de cuál
 * es cada token, y al leerlo se comprueba.
 *
 * Por qué importa: sin esa marca, el token de un mozo serviría para pasar por
 * las rutas del comensal y al revés. Están firmados con la misma clave, así
 * que la firma sola no alcanza para distinguirlos.
 */
type Acceso = { sub: number; email: string; tipo?: 'comensal' }
type Refresh = { sub: number; sid: string; tipo?: 'comensal' }
type AccesoStaff = { sub: number; rol: string; restauranteId: number; tipo: 'staff' }
type RefreshStaff = { sub: number; sid: string; tipo: 'staff' }

export function firmarAcceso(datos: Omit<Acceso, 'tipo'>): string {
  return jwt.sign({ ...datos, tipo: 'comensal' }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function firmarRefresh(datos: Omit<Refresh, 'tipo'>): string {
  return jwt.sign({ ...datos, tipo: 'comensal' }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function firmarAccesoStaff(datos: Omit<AccesoStaff, 'tipo'>): string {
  return jwt.sign({ ...datos, tipo: 'staff' }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function firmarRefreshStaff(datos: Omit<RefreshStaff, 'tipo'>): string {
  return jwt.sign({ ...datos, tipo: 'staff' }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
  })
}

/** Lo que sale de verificar un token, antes de saber de qué mundo es. */
type Contenido = { tipo?: 'comensal' | 'staff' } & Record<string, unknown>

function abrir(token: string, clave: string, esperado: 'comensal' | 'staff'): Contenido | null {
  try {
    const datos = jwt.verify(token, clave) as unknown as Contenido
    // Un token sin marca es de comensal: son los que se emitieron antes de que
    // existiera el panel del restaurante.
    return (datos.tipo ?? 'comensal') === esperado ? datos : null
  } catch {
    return null
  }
}

/** Devuelve null si el token está vencido, alterado, o es del otro mundo. */
export function leerAcceso(token: string): Acceso | null {
  return abrir(token, config.JWT_ACCESS_SECRET, 'comensal') as Acceso | null
}

export function leerRefresh(token: string): Refresh | null {
  return abrir(token, config.JWT_REFRESH_SECRET, 'comensal') as Refresh | null
}

export function leerAccesoStaff(token: string): AccesoStaff | null {
  return abrir(token, config.JWT_ACCESS_SECRET, 'staff') as AccesoStaff | null
}

export function leerRefreshStaff(token: string): RefreshStaff | null {
  return abrir(token, config.JWT_REFRESH_SECRET, 'staff') as RefreshStaff | null
}

// ── Códigos de confirmación ─────────────────────────────────

/** Seis dígitos. randomInt usa el generador criptográfico, no Math.random. */
export function generarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashearCodigo(codigo: string): string {
  return createHash('sha256').update(codigo).digest('hex')
}

/** Comparación en tiempo constante: no filtra cuántos dígitos coincidían. */
export function codigoCoincide(codigo: string, hashGuardado: string | null): boolean {
  if (!hashGuardado) return false
  const a = Buffer.from(hashearCodigo(codigo))
  const b = Buffer.from(hashGuardado)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex')
}
