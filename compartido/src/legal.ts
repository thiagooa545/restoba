/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Los tres documentos que el comensal acepta, con su versión vigente.

   Las claves «tyc», «privacidad» y «verificacion» son exactamente los valores que
   admite la columna documento de la tabla aceptacion_legal. No son nombres
   elegidos al azar: si alguien agrega un cuarto documento tiene que tocar este
   archivo Y la restricción de la base, y eso es a propósito.

   El anexo técnico es informativo y NO se acepta: por eso no figura acá.
   ════════════════════════════════════════════════════════════════════ */

import { z } from 'zod'

/**
 * Documentos que el comensal acepta por separado. Coincide con la restricción
 * `documento_valido` de la tabla `aceptacion_legal` (ver legal/README.md).
 * El anexo técnico es informativo y no se acepta.
 */
export const DOCUMENTOS_LEGALES = ['tyc', 'privacidad', 'verificacion'] as const
export type DocumentoLegal = (typeof DOCUMENTOS_LEGALES)[number]

/** Un cambio mayor de versión obliga a reaceptar. */
export const VERSION_LEGAL_VIGENTE = '1.0'

/** Archivo markdown que es la fuente de verdad de cada documento. */
export const ARCHIVO_LEGAL: Record<DocumentoLegal, string> = {
  tyc: '01-terminos-y-condiciones.md',
  privacidad: '02-politica-de-privacidad.md',
  verificacion: '03-acuerdo-de-verificacion.md',
}

export const documentoLegalSchema = z.enum(DOCUMENTOS_LEGALES)

export type DocumentoLegalRespuesta = {
  documento: DocumentoLegal
  version: string
  /** SHA-256 en hexadecimal del markdown exhibido. */
  hash: string
  /** Texto completo, no un resumen (Acuerdo de Verificación, secc. 6.1). */
  markdown: string
}

/**
 * Cuerpo de `POST /api/legal/aceptacion`. El hash lo manda el cliente y la API
 * lo revalida contra el archivo: la constancia solo vale si coincide con el
 * texto que se exhibió.
 */
export const aceptacionLegalSchema = z.object({
  documento: documentoLegalSchema,
  version: z.string().min(1).max(16),
  hash: z.string().length(64),
})

export type EstadoLegal = {
  documentosAceptados: boolean
  emailVerificado: boolean
  telefonoVerificado: boolean
  /** Verdadero solo si se cumplen las tres condiciones anteriores. */
  verificado: boolean
  pendientes: DocumentoLegal[]
}
