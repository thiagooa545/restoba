import {
  ARCHIVO_LEGAL,
  VERSION_LEGAL_VIGENTE,
  type DocumentoLegal,
  type DocumentoLegalRespuesta,
} from '@restoba/compartido'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DIR_LEGAL } from './config.js'
import { sha256 } from './seguridad.js'

/**
 * Sirve los documentos legales leyéndolos de legal/*.md.
 *
 * El README del marco legal es explícito: esos archivos son la fuente de
 * verdad y la aplicación debe renderizarlos desde ahí, no mantener copias.
 * El hash se calcula sobre el mismo texto que se exhibe, que es lo que exige
 * el requisito 4 de la pantalla de aceptación.
 */

type Cacheado = DocumentoLegalRespuesta & { mtime: number }

const cache = new Map<DocumentoLegal, Cacheado>()

export async function leerDocumento(documento: DocumentoLegal): Promise<DocumentoLegalRespuesta> {
  const ruta = resolve(DIR_LEGAL, ARCHIVO_LEGAL[documento])
  const { mtimeMs } = await stat(ruta)

  const guardado = cache.get(documento)
  if (guardado && guardado.mtime === mtimeMs) {
    const { mtime: _, ...respuesta } = guardado
    return respuesta
  }

  const markdown = await readFile(ruta, 'utf8')
  const respuesta: DocumentoLegalRespuesta = {
    documento,
    version: VERSION_LEGAL_VIGENTE,
    hash: sha256(markdown),
    markdown,
  }

  cache.set(documento, { ...respuesta, mtime: mtimeMs })
  return respuesta
}
