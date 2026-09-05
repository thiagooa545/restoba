import { busquedaSchema, RADIOS, type RespuestaBusqueda } from '@restoba/shared'
import { Router } from 'express'
import { z } from 'zod'
import {
  buscarRestaurantes,
  listarTiposCocina,
  obtenerRestaurante,
} from '../db/restaurantes.js'

export const rutasRestaurantes = Router()

/** `precio=1,2` llega como texto; se convierte a lista antes de validar. */
function aLista(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor
  return valor.split(',').filter((s) => s.trim() !== '')
}

rutasRestaurantes.get('/tipos-cocina', async (_req, res) => {
  try {
    res.json({ tipos: await listarTiposCocina() })
  } catch (error) {
    console.error('Error listando tipos de cocina:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

/**
 * Buscador (RF-02, RF-03, RF-04).
 *
 * Si el usuario compartió la ubicación y no fijó un radio, se prueban los radios
 * en escalera (1, 3 y 10 km) hasta encontrar algo, y se informa si hubo que
 * ampliar. Es el flujo alternativo del CU-01 resuelto del lado del servidor: la
 * interfaz solo tiene que mostrar el aviso.
 */
rutasRestaurantes.get('/restaurantes', async (req, res) => {
  const parseo = busquedaSchema.safeParse({
    ...req.query,
    precio: aLista(req.query['precio']),
  })

  if (!parseo.success) {
    res.status(400).json({
      error: 'parametros_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  const criterios = parseo.data
  const conUbicacion = criterios.lat !== undefined && criterios.lng !== undefined

  try {
    // Sin ubicación no hay cercanía posible: se ordena por puntaje y se avisa.
    const orden = criterios.orden === 'cercania' && !conUbicacion ? 'puntaje' : criterios.orden

    let radioAplicado: number | null = null
    let radioAmpliado = false
    let resultado = { filas: [] as Awaited<ReturnType<typeof buscarRestaurantes>>['filas'], total: 0 }

    if (!conUbicacion) {
      resultado = await buscarRestaurantes({ ...criterios, orden })
    } else if (criterios.radio !== undefined) {
      radioAplicado = criterios.radio
      resultado = await buscarRestaurantes({ ...criterios, orden, radio: criterios.radio })
    } else {
      for (const [indice, radio] of RADIOS.entries()) {
        resultado = await buscarRestaurantes({ ...criterios, orden, radio })
        radioAplicado = radio
        if (resultado.filas.length > 0) {
          radioAmpliado = indice > 0
          break
        }
      }
    }

    const respuesta: RespuestaBusqueda = {
      resultados: resultado.filas,
      total: resultado.total,
      radioAplicado,
      radioAmpliado,
      ordenAplicado: orden,
      conUbicacion,
    }

    res.json(respuesta)
  } catch (error) {
    console.error('Error en la búsqueda de restaurantes:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

const idSchema = z.coerce.number().int().positive()
const ubicacionSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

/** Perfil del restaurante con horarios y carta (RF-05). */
rutasRestaurantes.get('/restaurantes/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  const ubicacion = ubicacionSchema.safeParse(req.query)

  try {
    const restaurante = await obtenerRestaurante(
      id.data,
      ubicacion.success ? ubicacion.data : undefined,
    )

    if (!restaurante) {
      res.status(404).json({ error: 'restaurante_no_encontrado' })
      return
    }

    res.json(restaurante)
  } catch (error) {
    console.error('Error obteniendo el restaurante:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
