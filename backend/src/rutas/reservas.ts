import { consultaDisponibilidadSchema, nuevaReservaSchema } from '@restoba/compartido'
import { Router } from 'express'
import { z } from 'zod'
import {
  cancelarReserva,
  crearReserva,
  disponibilidad,
  reservaDe,
  reservasDe,
} from '../db/reservas.js'
import { requiereSesion, requiereVerificado } from '../middleware/auth.js'

export const rutasReservas = Router()

const idSchema = z.coerce.number().int().positive()

const MOTIVOS: Record<string, string> = {
  cerrado: 'Ese día el local no atiende.',
  turno_no_disponible: 'Ese horario no está entre los turnos del local.',
  sin_mesa: 'Se ocupó la última mesa de ese turno. Probá con otro horario.',
  grupo_muy_grande: 'No tienen una mesa para ese grupo. Escribiles y coordinan.',
  duplicada: 'Ya tenés una reserva confirmada en este local para ese día.',
}

/** Turnos disponibles de un local en una fecha. Es público: no exige sesión. */
rutasReservas.get('/restaurantes/:id/disponibilidad', async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const consulta = consultaDisponibilidadSchema.safeParse(req.query)

  if (!id.success || !consulta.success) {
    res.status(400).json({ error: 'parametros_invalidos' })
    return
  }

  try {
    res.json(await disponibilidad(id.data, consulta.data.fecha, consulta.data.personas))
  } catch (error) {
    console.error('Error calculando la disponibilidad:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/** Crear reserva. Solo Usuario Verificado (T&C art. 5). */
rutasReservas.post('/reservas', requiereSesion, requiereVerificado, async (req, res) => {
  const parseo = nuevaReservaSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  const { restauranteId, fecha, hora, personas, notas } = parseo.data

  try {
    const resultado = await crearReserva({
      restauranteId,
      comensalId: req.comensal!.id,
      fecha,
      hora,
      personas,
      notas,
    })

    if (!resultado.ok) {
      res.status(409).json({ error: resultado.motivo, mensaje: MOTIVOS[resultado.motivo] })
      return
    }

    const reserva = await reservaDe(resultado.id, req.comensal!.id)
    res.status(201).json({ reserva })
  } catch (error) {
    console.error('Error creando la reserva:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasReservas.get('/reservas/mias', requiereSesion, async (req, res) => {
  try {
    res.json({ reservas: await reservasDe(req.comensal!.id) })
  } catch (error) {
    console.error('Error listando las reservas:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasReservas.post('/reservas/:id/cancelar', requiereSesion, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    const reserva = await reservaDe(id.data, req.comensal!.id)

    if (!reserva) {
      res.status(404).json({ error: 'reserva_no_encontrada' })
      return
    }

    if (!reserva.cancelable) {
      res.status(409).json({
        error: 'fuera_de_plazo',
        mensaje:
          reserva.estado !== 'confirmada'
            ? 'Esa reserva ya no está confirmada.'
            : 'Ya pasó el plazo para cancelar sin costo. Llamá al local.',
      })
      return
    }

    await cancelarReserva(id.data, req.comensal!.id)
    res.json({ reserva: await reservaDe(id.data, req.comensal!.id) })
  } catch (error) {
    console.error('Error cancelando la reserva:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
