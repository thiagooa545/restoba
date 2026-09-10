import { canjeSchema } from '@restoba/compartido'
import { Router } from 'express'
import { z } from 'zod'
import { alternarFavorito, canjear, estadoPuntos, idsFavoritos } from '../db/cuenta.js'
import { buscarRestaurantes } from '../db/restaurantes.js'
import { requiereSesion, requiereVerificado } from '../middleware/auth.js'

export const rutasCuenta = Router()

const idSchema = z.coerce.number().int().positive()

// ── Favoritos ───────────────────────────────────────────────

rutasCuenta.post('/favoritos/:restauranteId', requiereSesion, async (req, res) => {
  const id = idSchema.safeParse(req.params.restauranteId)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    res.json({ favorito: await alternarFavorito(req.comensal!.id, id.data) })
  } catch (error) {
    console.error('Error alternando favorito:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasCuenta.get('/favoritos', requiereSesion, async (req, res) => {
  try {
    const ids = (await idsFavoritos(req.comensal!.id)).map((f) => f.restaurante_id)

    if (ids.length === 0) {
      res.json({ ids: [], restaurantes: [] })
      return
    }

    // Se reusa el buscador para traer las fichas completas, con su estado de
    // apertura y sus tipos de cocina, en lugar de repetir la consulta.
    const { filas } = await buscarRestaurantes({ orden: 'puntaje', limite: 50 })
    res.json({ ids, restaurantes: filas.filter((r) => ids.includes(r.id)) })
  } catch (error) {
    console.error('Error listando favoritos:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Puntos y cupones ────────────────────────────────────────

rutasCuenta.get('/puntos', requiereSesion, async (req, res) => {
  try {
    res.json(await estadoPuntos(req.comensal!.id))
  } catch (error) {
    console.error('Error consultando los puntos:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/** El canje es irreversible (T&C art. 8), así que exige cuenta verificada. */
rutasCuenta.post('/puntos/canjear', requiereSesion, requiereVerificado, async (req, res) => {
  const parseo = canjeSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'cupon_invalido' })
    return
  }

  try {
    const resultado = await canjear(req.comensal!.id, parseo.data.cupon)

    if (!resultado.ok) {
      res.status(409).json({
        error: 'saldo_insuficiente',
        mensaje: 'No te alcanzan los puntos para ese cupón.',
      })
      return
    }

    res.status(201).json({ cupon: resultado.cupon, estado: await estadoPuntos(req.comensal!.id) })
  } catch (error) {
    console.error('Error canjeando puntos:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
