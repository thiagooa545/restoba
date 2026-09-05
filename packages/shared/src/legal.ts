import { z } from 'zod'

/**
 * Documentos que el comensal acepta por separado.
 * Coincide con la restricción `documento_valido` de la tabla `aceptacion_legal`
 * (legal/README.md) y con las claves internas del marco legal.
 *
 * El anexo técnico (documento 04) es informativo y NO se acepta.
 */
export const DOCUMENTOS_LEGALES = ['tyc', 'privacidad', 'verificacion'] as const
export type DocumentoLegal = (typeof DOCUMENTOS_LEGALES)[number]

/** Versión vigente de cada documento. Un cambio mayor obliga a reaceptar. */
export const VERSION_LEGAL_VIGENTE = '1.0'

/** Nombre del archivo markdown que es la fuente de verdad de cada documento. */
export const ARCHIVO_LEGAL: Record<DocumentoLegal, string> = {
  tyc: '01-terminos-y-condiciones.md',
  privacidad: '02-politica-de-privacidad.md',
  verificacion: '03-acuerdo-de-verificacion.md',
}

export const documentoLegalSchema = z.enum(DOCUMENTOS_LEGALES)

/** Lo que devuelve `GET /api/legal/:documento`. */
export const documentoLegalRespuestaSchema = z.object({
  documento: documentoLegalSchema,
  version: z.string(),
  /** SHA-256 en hexadecimal del markdown exhibido. */
  hash: z.string().length(64),
  /** Texto completo, no un resumen (Acuerdo de Verificación, secc. 6.1). */
  markdown: z.string(),
})
export type DocumentoLegalRespuesta = z.infer<typeof documentoLegalRespuestaSchema>

/**
 * Cuerpo de `POST /api/legal/aceptacion`.
 *
 * El hash lo manda el cliente y la API lo revalida contra el archivo:
 * la constancia solo vale si coincide con el texto que se exhibió.
 */
export const aceptacionLegalSchema = z.object({
  documento: documentoLegalSchema,
  version: z.string().min(1).max(16),
  hash: z.string().length(64),
})
export type AceptacionLegal = z.infer<typeof aceptacionLegalSchema>

/** Estado del gate de verificación para el usuario en sesión. */
export const estadoLegalSchema = z.object({
  /** Aceptó los tres documentos en su versión vigente. */
  documentosAceptados: z.boolean(),
  emailVerificado: z.boolean(),
  telefonoVerificado: z.boolean(),
  /** Verdadero solo si se cumplen las tres condiciones anteriores. */
  verificado: z.boolean(),
  pendientes: z.array(documentoLegalSchema),
})
export type EstadoLegal = z.infer<typeof estadoLegalSchema>
