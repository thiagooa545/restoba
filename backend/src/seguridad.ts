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

type Acceso = { sub: number; email: string }
type Refresh = { sub: number; sid: string }

export function firmarAcceso(datos: Acceso): string {
  return jwt.sign(datos, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function firmarRefresh(datos: Refresh): string {
  return jwt.sign(datos, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
  })
}

/** Devuelve null si el token está vencido, alterado o firmado con otra clave. */
export function leerAcceso(token: string): Acceso | null {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as unknown as Acceso
  } catch {
    return null
  }
}

export function leerRefresh(token: string): Refresh | null {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as unknown as Refresh
  } catch {
    return null
  }
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
