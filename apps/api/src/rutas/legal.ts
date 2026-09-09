import {
  aceptacionLegalSchema,
  documentoLegalSchema,
  DOCUMENTOS_LEGALES,
  VERSION_LEGAL_VIGENTE,
} from '@restoba/shared'
import { Router } from 'express'
import { aPublico, estadoLegal, porId, registrarAceptacion, revocarAceptaciones } from '../db/comensales.js'
import { leerDocumento } from '../documentos-legales.js'
import { requiereSesion } from '../middleware/auth.js'

export const rutasLegal = Router()

/** Índice de los documentos que se aceptan, con su versión y su huella. */
rutasLegal.get('/legal', async (_req, res) => {
  try {
    const documentos = await Promise.all(
      DOCUMENTOS_LEGALES.map(async (clave) => {
        const { markdown: _, ...resto } = await leerDocumento(clave)
        return resto
      }),
    )
    res.json({ version: VERSION_LEGAL_VIGENTE, documentos })
  } catch (error) {
    console.error('Error leyendo los documentos legales:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/**
 * Texto completo de un documento, tal cual está en legal/*.md, junto con el
 * SHA-256 de ese mismo texto. El requisito 1 de la pantalla de aceptación pide
 * exhibir el texto completo, no un resumen.
 */
rutasLegal.get('/legal/:documento', async (req, res) => {
  const clave = documentoLegalSchema.safeParse(req.params.documento)
  if (!clave.success) {
    res.status(404).json({ error: 'documento_no_encontrado' })
    return
  }

  try {
    res.json(await leerDocumento(clave.data))
  } catch (error) {
    console.error('Error leyendo el documento legal:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/**
 * Registra la constancia de aceptación.
 *
 * El hash que manda el cliente se revalida contra el archivo: si no coincide,
 * el usuario aceptó un texto distinto del que está publicado y la constancia
 * no tendría valor probatorio.
 */
rutasLegal.post('/legal/aceptacion', requiereSesion, async (req, res) => {
  const parseo = aceptacionLegalSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  const { documento, version, hash } = parseo.data
  const fila = req.comensal!

  try {
    const actual = await leerDocumento(documento)

    if (version !== actual.version) {
      res.status(409).json({
        error: 'version_desactualizada',
        mensaje: `El documento cambió de versión mientras lo leías (ahora es la ${actual.version}). Volvé a leerlo.`,
        versionActual: actual.version,
      })
      return
    }

    if (hash !== actual.hash) {
      res.status(409).json({
        error: 'texto_no_coincide',
        mensaje:
          'El texto que aceptaste no coincide con el publicado. Recargá la página y volvé a leerlo.',
      })
      return
    }

    await registrarAceptacion({
      comensalId: fila.id,
      documento,
      version,
      hash,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    })

    const actualizado = await porId(fila.id)
    res.json({ comensal: await aPublico(actualizado!) })
  } catch (error) {
    console.error('Error registrando la aceptación:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/** Estado del gate para el usuario en sesión. */
rutasLegal.get('/legal/estado/mio', requiereSesion, async (req, res) => {
  const fila = req.comensal!
  res.json(await estadoLegal(fila.id, fila.email_verificado, fila.telefono_verificado))
})

/**
 * Revocación (Acuerdo de Verificación, secc. 7).
 * No borra nada: marca las constancias como revocadas y la cuenta vuelve al
 * nivel de Usuario Registrado, conservando todos sus datos.
 */
rutasLegal.post('/legal/revocar', requiereSesion, async (req, res) => {
  const fila = req.comensal!
  try {
    await revocarAceptaciones(fila.id)
    const actualizado = await porId(fila.id)
    res.json({ comensal: await aPublico(actualizado!) })
  } catch (error) {
    console.error('Error revocando las aceptaciones:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
