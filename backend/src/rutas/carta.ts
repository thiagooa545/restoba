/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Los endpoints con los que el restaurante carga y edita su menú.

   Esta es la respuesta a «¿dónde sube el restaurante su carta y cómo se
   actualiza en la página?». Se sube por acá, y se actualiza sola: estas
   rutas escriben en las tablas `categoria` y `producto`, que son las
   mismas que lee GET /api/restaurantes/:id para armar el perfil público.
   No hay un botón de publicar porque no hay nada que publicar.

   Los permisos son los mismos del depósito: solo el administrador, y
   para escribir además hace falta la suscripción al día. Un local impago
   puede mirar su carta pero no cambiarla, y mientras tanto tampoco
   aparece en el buscador (T&C art. 10).

   El restaurante_id sale siempre de req.usuario, que viene del token.
   Nunca del cuerpo ni de la URL: si viniera de ahí, cambiar un número en
   el navegador alcanzaría para editar la carta de otro local (RF-12).

   Responde a: RF-08, RF-12 y T&C art. 10.
   ════════════════════════════════════════════════════════════════════ */

import {
  editarCategoriaSchema,
  editarProductoSchema,
  nuevaCategoriaSchema,
  nuevoProductoSchema,
} from '@restoba/compartido'
import { Router } from 'express'
import { z } from 'zod'
import {
  borrarCategoria,
  borrarProducto,
  crearCategoria,
  crearProducto,
  editarCategoria,
  editarProducto,
  verCarta,
} from '../db/carta.js'
import { requiereRol, requiereStaff, requiereSuscripcion } from '../middleware/staff.js'

export const rutasCarta = Router()

const idSchema = z.coerce.number().int().positive()

const soloAdmin = [requiereStaff, requiereRol('admin')] as const
const adminAlDia = [requiereStaff, requiereRol('admin'), requiereSuscripcion] as const

/** Los errores de validación se devuelven campo por campo, como en el resto. */
function invalido(res: Parameters<Parameters<typeof rutasCarta.get>[1]>[1], error: z.ZodError) {
  res.status(400).json({
    error: 'datos_invalidos',
    detalle: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
  })
}

// ── La carta completa ───────────────────────────────────────

rutasCarta.get('/gestion/carta', ...soloAdmin, async (req, res) => {
  try {
    res.json({ carta: await verCarta(req.usuario!.restaurante_id) })
  } catch (error) {
    console.error('Error leyendo la carta:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Secciones ───────────────────────────────────────────────

rutasCarta.post('/gestion/carta/secciones', ...adminAlDia, async (req, res) => {
  const parseo = nuevaCategoriaSchema.safeParse(req.body)
  if (!parseo.success) return invalido(res, parseo.error)

  try {
    const categoria = await crearCategoria(req.usuario!.restaurante_id, parseo.data.nombre)
    res.status(201).json({ categoria })
  } catch (error) {
    console.error('Error creando la sección:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasCarta.put('/gestion/carta/secciones/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = editarCategoriaSchema.safeParse(req.body)
  if (!id.success || !parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const categoria = await editarCategoria(id.data, req.usuario!.restaurante_id, parseo.data)
    if (!categoria) {
      res.status(404).json({ error: 'seccion_no_encontrada' })
      return
    }
    res.json({ categoria })
  } catch (error) {
    console.error('Error editando la sección:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasCarta.delete('/gestion/carta/secciones/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    const resultado = await borrarCategoria(id.data, req.usuario!.restaurante_id)
    if (resultado === 'no_encontrada') {
      res.status(404).json({ error: 'seccion_no_encontrada' })
      return
    }
    if (resultado === 'tiene_productos') {
      res.status(409).json({
        error: 'seccion_con_platos',
        mensaje: 'Primero movés los platos a otra sección, así no se borran sin querer.',
      })
      return
    }
    res.json({ ok: true })
  } catch (error) {
    console.error('Error borrando la sección:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Platos ──────────────────────────────────────────────────

rutasCarta.post('/gestion/carta/platos', ...adminAlDia, async (req, res) => {
  const parseo = nuevoProductoSchema.safeParse(req.body)
  if (!parseo.success) return invalido(res, parseo.error)

  try {
    const producto = await crearProducto(req.usuario!.restaurante_id, parseo.data)
    if (producto === 'categoria_ajena') {
      res.status(404).json({ error: 'seccion_no_encontrada' })
      return
    }
    res.status(201).json({ producto })
  } catch (error) {
    console.error('Error creando el plato:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasCarta.put('/gestion/carta/platos/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = editarProductoSchema.safeParse(req.body)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }
  if (!parseo.success) return invalido(res, parseo.error)

  try {
    const producto = await editarProducto(id.data, req.usuario!.restaurante_id, parseo.data)
    if (producto === 'no_encontrado') {
      res.status(404).json({ error: 'plato_no_encontrado' })
      return
    }
    if (producto === 'categoria_ajena') {
      res.status(404).json({ error: 'seccion_no_encontrada' })
      return
    }
    res.json({ producto })
  } catch (error) {
    console.error('Error editando el plato:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasCarta.delete('/gestion/carta/platos/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    const borrado = await borrarProducto(id.data, req.usuario!.restaurante_id)
    if (!borrado) {
      res.status(404).json({ error: 'plato_no_encontrado' })
      return
    }
    res.json({ ok: true })
  } catch (error) {
    console.error('Error borrando el plato:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})
