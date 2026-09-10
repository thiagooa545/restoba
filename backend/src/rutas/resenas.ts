import { nuevaResenaSchema } from '@restoba/compartido'
import { Router } from 'express'
import { z } from 'zod'
import { crearResena, editarResena, resenasDe, visitasSinResenar } from '../db/resenas.js'
import { conSesionOpcional, requiereSesion, requiereVerificado } from '../middleware/auth.js'

export const rutasResenas = Router()

const idSchema = z.coerce.number().int().positive()

/** Reseñas de un local. Público: leerlas no exige cuenta (T&C art. 5). */
rutasResenas.get('/restaurantes/:id/resenas', conSesionOpcional, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    res.json(await resenasDe(id.data, req.comensal?.id ?? null))
  } catch (error) {
    console.error('Error listando reseñas:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/** Visitas del comensal que todavía no reseñó. */
rutasResenas.get('/resenas/pendientes', requiereSesion, async (req, res) => {
  const restaurante = idSchema.safeParse(req.query['restaurante'])

  try {
    res.json({
      visitas: await visitasSinResenar(
        req.comensal!.id,
        restaurante.success ? restaurante.data : undefined,
      ),
    })
  } catch (error) {
    console.error('Error listando visitas sin reseñar:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/**
 * Publicar una reseña. Exige cuenta verificada y, sobre todo, una visita
 * previa registrada: es la regla del art. 7.5 y por eso el cuerpo lleva el id
 * de la reserva, no el del restaurante.
 */
rutasResenas.post('/resenas', requiereSesion, requiereVerificado, async (req, res) => {
  const parseo = nuevaResenaSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  try {
    const resultado = await crearResena({
      comensalId: req.comensal!.id,
      autor: req.comensal!.nombre,
      ...parseo.data,
    })

    if (!resultado.ok) {
      res.status(409).json({
        error: resultado.motivo,
        mensaje:
          resultado.motivo === 'ya_resenada'
            ? 'Ya dejaste una reseña de esa visita. Podés editarla.'
            : 'Solo se puede reseñar un local donde tengas una visita registrada que ya haya pasado.',
      })
      return
    }

    res.status(201).json({ id: resultado.id, puntosGanados: resultado.puntos })
  } catch (error) {
    console.error('Error publicando la reseña:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

const edicionSchema = z.object({
  puntuacion: z.coerce.number().int().min(1).max(5),
  comentario: z.string().trim().max(1500).optional(),
})

rutasResenas.put('/resenas/:id', requiereSesion, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = edicionSchema.safeParse(req.body)

  if (!id.success || !parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const listo = await editarResena({
      id: id.data,
      comensalId: req.comensal!.id,
      ...parseo.data,
    })

    if (!listo) {
      res.status(404).json({ error: 'resena_no_encontrada' })
      return
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('Error editando la reseña:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
