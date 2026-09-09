import {
  DOCUMENTOS_LEGALES,
  VERSION_LEGAL_VIGENTE,
  type ComensalPublico,
  type DocumentoLegal,
  type EstadoLegal,
  type NivelAcceso,
} from '@restoba/shared'
import { telefonoEnmascarado } from '../seguridad.js'
import { consultar, consultarUna } from './pool.js'

export type FilaComensal = {
  id: number
  nombre: string
  email: string
  password_hash: string
  email_verificado: boolean
  telefono_cifrado: string | null
  telefono_verificado: boolean
  codigo_email: string | null
  codigo_email_vence: Date | null
  codigo_tel: string | null
  codigo_tel_vence: Date | null
  baja_en: Date | null
}

const CAMPOS = `id, nombre, email, password_hash, email_verificado, telefono_cifrado,
                telefono_verificado, codigo_email, codigo_email_vence, codigo_tel,
                codigo_tel_vence, baja_en`

export function porEmail(email: string): Promise<FilaComensal | null> {
  return consultarUna<FilaComensal>(
    `SELECT ${CAMPOS} FROM comensal WHERE email = $1 AND baja_en IS NULL`,
    [email.toLowerCase()],
  )
}

export function porId(id: number): Promise<FilaComensal | null> {
  return consultarUna<FilaComensal>(
    `SELECT ${CAMPOS} FROM comensal WHERE id = $1 AND baja_en IS NULL`,
    [id],
  )
}

export async function crearComensal(datos: {
  nombre: string
  email: string
  passwordHash: string
  codigoEmail: string
  venceEn: Date
}): Promise<FilaComensal> {
  const fila = await consultarUna<FilaComensal>(
    `INSERT INTO comensal (nombre, email, password_hash, codigo_email, codigo_email_vence)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${CAMPOS}`,
    [datos.nombre, datos.email.toLowerCase(), datos.passwordHash, datos.codigoEmail, datos.venceEn],
  )
  if (!fila) throw new Error('No se pudo crear el comensal')
  return fila
}

export async function guardarCodigoEmail(id: number, hash: string, vence: Date): Promise<void> {
  await consultar('UPDATE comensal SET codigo_email = $2, codigo_email_vence = $3 WHERE id = $1', [
    id,
    hash,
    vence,
  ])
}

export async function marcarEmailVerificado(id: number): Promise<void> {
  await consultar(
    `UPDATE comensal
     SET email_verificado = true, codigo_email = NULL, codigo_email_vence = NULL
     WHERE id = $1`,
    [id],
  )
}

export async function guardarTelefono(
  id: number,
  cifrado: string,
  hashCodigo: string,
  vence: Date,
): Promise<void> {
  await consultar(
    `UPDATE comensal
     SET telefono_cifrado = $2, telefono_verificado = false,
         codigo_tel = $3, codigo_tel_vence = $4
     WHERE id = $1`,
    [id, cifrado, hashCodigo, vence],
  )
}

export async function marcarTelefonoVerificado(id: number): Promise<void> {
  await consultar(
    `UPDATE comensal
     SET telefono_verificado = true, codigo_tel = NULL, codigo_tel_vence = NULL
     WHERE id = $1`,
    [id],
  )
}

// ── Constancias legales ─────────────────────────────────────

/**
 * Resuelve el estado del gate de verificación.
 *
 * Es exactamente la regla de legal/README.md: un usuario es verificado si y
 * solo si tiene constancias vigentes de los tres documentos en su versión
 * actual, además de correo y teléfono confirmados.
 */
export async function estadoLegal(
  comensalId: number,
  emailVerificado: boolean,
  telefonoVerificado: boolean,
): Promise<EstadoLegal> {
  const filas = await consultar<{ documento: DocumentoLegal }>(
    `SELECT documento
     FROM   aceptacion_legal
     WHERE  usuario_id = $1
       AND  revocado_en IS NULL
       AND  version = $2
       AND  documento = ANY($3::text[])`,
    [comensalId, VERSION_LEGAL_VIGENTE, [...DOCUMENTOS_LEGALES]],
  )

  const aceptados = new Set(filas.map((f) => f.documento))
  const pendientes = DOCUMENTOS_LEGALES.filter((d) => !aceptados.has(d))
  const documentosAceptados = pendientes.length === 0

  return {
    documentosAceptados,
    emailVerificado,
    telefonoVerificado,
    verificado: documentosAceptados && emailVerificado && telefonoVerificado,
    pendientes: [...pendientes],
  }
}

export async function registrarAceptacion(datos: {
  comensalId: number
  documento: DocumentoLegal
  version: string
  hash: string
  ip: string | null
  userAgent: string | null
}): Promise<void> {
  // Si ya existe la constancia para esa versión, se reactiva en lugar de
  // duplicarla: la restricción una_aceptacion_por_version lo impide.
  await consultar(
    `INSERT INTO aceptacion_legal (usuario_id, documento, version, hash_texto, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (usuario_id, documento, version)
     DO UPDATE SET revocado_en = NULL, aceptado_en = now(),
                   hash_texto = EXCLUDED.hash_texto,
                   ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent`,
    [datos.comensalId, datos.documento, datos.version, datos.hash, datos.ip, datos.userAgent],
  )
}

/** Revocar no borra: completa revocado_en y conserva la prueba del consentimiento. */
export async function revocarAceptaciones(comensalId: number): Promise<void> {
  await consultar(
    `UPDATE aceptacion_legal
     SET revocado_en = now()
     WHERE usuario_id = $1 AND revocado_en IS NULL`,
    [comensalId],
  )
}

// ── Vista pública ───────────────────────────────────────────

function nivelDe(legal: EstadoLegal): NivelAcceso {
  return legal.verificado ? 'verificado' : 'registrado'
}

export async function aPublico(fila: FilaComensal): Promise<ComensalPublico> {
  const legal = await estadoLegal(fila.id, fila.email_verificado, fila.telefono_verificado)

  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    emailVerificado: fila.email_verificado,
    // Nunca sale el número completo del servidor.
    telefono: fila.telefono_cifrado ? telefonoEnmascarado(fila.telefono_cifrado) : null,
    telefonoVerificado: fila.telefono_verificado,
    nivel: nivelDe(legal),
    legal,
  }
}

// ── Sesiones ────────────────────────────────────────────────

export async function abrirSesion(datos: {
  comensalId: number
  expiraEn: Date
  ip: string | null
  userAgent: string | null
}): Promise<string> {
  const fila = await consultarUna<{ id: string }>(
    `INSERT INTO sesion (comensal_id, expira_en, ip, user_agent)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [datos.comensalId, datos.expiraEn, datos.ip, datos.userAgent],
  )
  if (!fila) throw new Error('No se pudo abrir la sesión')
  return fila.id
}

export function sesionVigente(id: string, comensalId: number): Promise<{ id: string } | null> {
  return consultarUna<{ id: string }>(
    `SELECT id FROM sesion
     WHERE id = $1 AND comensal_id = $2 AND revocada_en IS NULL AND expira_en > now()`,
    [id, comensalId],
  )
}

export async function revocarSesion(id: string): Promise<void> {
  await consultar('UPDATE sesion SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL', [id])
}
