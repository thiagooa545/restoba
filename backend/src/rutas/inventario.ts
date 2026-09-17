/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Los endpoints del inventario. Todos exigen rol de administrador.

   Por qué solo el administrador: el mozo y la cocina no compran ni
   cuentan mercadería. Es la tabla de actores del documento aplicada
   tal cual, y evita que un error de alguien que no maneja el depósito
   descuadre el stock.

   Fijarse en que cada ruta declara los tres filtros en fila:
   requiereStaff, requiereRol('admin') y requiereSuscripcion. El tercero
   es el que pone al local impago en modo lectura: puede mirar su stock,
   pero no moverlo hasta regularizar.

   Responde a: RF-08, RF-12 y T&C art. 10.
   ════════════════════════════════════════════════════════════════════ */

import {
  editarIngredienteSchema,
  movimientoSchema,
  nuevoIngredienteSchema,
  recetaSchema,
} from '@restoba/compartido'
import { Router } from 'express'
import { z } from 'zod'
import {
  contarBajoMinimo,
  crearIngrediente,
  editarIngrediente,
  guardarReceta,
  historial,
  listarIngredientes,
  obtenerReceta,
  platosConReceta,
  registrarMovimiento,
} from '../db/inventario.js'
import { requiereRol, requiereStaff, requiereSuscripcion } from '../middleware/staff.js'

export const rutasInventario = Router()

const idSchema = z.coerce.number().int().positive()

/** Los tres filtros que comparten casi todas las rutas de esta sección. */
const soloAdmin = [requiereStaff, requiereRol('admin')] as const
const adminAlDia = [requiereStaff, requiereRol('admin'), requiereSuscripcion] as const

// ── Ingredientes ────────────────────────────────────────────

rutasInventario.get('/gestion/inventario', ...soloAdmin, async (req, res) => {
  try {
    const restauranteId = req.usuario!.restaurante_id
    const [ingredientes, alerta] = await Promise.all([
      listarIngredientes(restauranteId),
      contarBajoMinimo(restauranteId),
    ])
    res.json({ ingredientes, bajoMinimo: alerta?.cantidad ?? 0 })
  } catch (error) {
    console.error('Error listando el inventario:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasInventario.post('/gestion/inventario', ...adminAlDia, async (req, res) => {
  const parseo = nuevoIngredienteSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  try {
    const ingrediente = await crearIngrediente({
      restauranteId: req.usuario!.restaurante_id,
      usuarioId: req.usuario!.id,
      ...parseo.data,
    })
    res.status(201).json({ ingrediente })
  } catch (error) {
    // La restricción de nombre único por local llega como código 23505.
    if ((error as { code?: string })?.code === '23505') {
      res.status(409).json({
        error: 'nombre_repetido',
        mensaje: 'Ya tenés un ingrediente con ese nombre.',
      })
      return
    }
    console.error('Error creando el ingrediente:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasInventario.put('/gestion/inventario/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = editarIngredienteSchema.safeParse(req.body)

  if (!id.success || !parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const ingrediente = await editarIngrediente(
      id.data,
      req.usuario!.restaurante_id,
      parseo.data,
    )
    if (!ingrediente) {
      res.status(404).json({ error: 'ingrediente_no_encontrado' })
      return
    }
    res.json({ ingrediente })
  } catch (error) {
    console.error('Error editando el ingrediente:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Movimientos de stock ────────────────────────────────────

rutasInventario.post('/gestion/inventario/:id/movimiento', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = movimientoSchema.safeParse(req.body)

  if (!id.success || !parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.success
        ? undefined
        : parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  try {
    const resultado = await registrarMovimiento({
      ingredienteId: id.data,
      restauranteId: req.usuario!.restaurante_id,
      usuarioId: req.usuario!.id,
      ...parseo.data,
    })

    if (!resultado.ok) {
      if (resultado.motivo === 'no_encontrado') {
        res.status(404).json({ error: 'ingrediente_no_encontrado' })
        return
      }
      res.status(409).json({
        error: 'stock_insuficiente',
        mensaje: `No podés descontar más de lo que hay. Quedan ${resultado.disponible}.`,
      })
      return
    }

    res.json({ ingrediente: resultado.ingrediente })
  } catch (error) {
    console.error('Error registrando el movimiento:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasInventario.get('/gestion/inventario/movimientos', ...soloAdmin, async (req, res) => {
  try {
    res.json({ movimientos: await historial(req.usuario!.restaurante_id) })
  } catch (error) {
    console.error('Error leyendo el historial:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Recetas ─────────────────────────────────────────────────

rutasInventario.get('/gestion/recetas', ...soloAdmin, async (req, res) => {
  try {
    res.json({ platos: await platosConReceta(req.usuario!.restaurante_id) })
  } catch (error) {
    console.error('Error listando las recetas:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasInventario.get('/gestion/recetas/:id', ...soloAdmin, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: 'id_invalido' })
    return
  }

  try {
    const receta = await obtenerReceta(id.data, req.usuario!.restaurante_id)
    if (!receta) {
      res.status(404).json({ error: 'producto_no_encontrado' })
      return
    }
    res.json({ receta })
  } catch (error) {
    console.error('Error leyendo la receta:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasInventario.put('/gestion/recetas/:id', ...adminAlDia, async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  const parseo = recetaSchema.safeParse(req.body)

  if (!id.success || !parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const receta = await guardarReceta(
      id.data,
      req.usuario!.restaurante_id,
      parseo.data.items,
    )
    res.json({ receta })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : ''
    if (mensaje === 'producto_no_encontrado') {
      res.status(404).json({ error: 'producto_no_encontrado' })
      return
    }
    if (mensaje === 'ingrediente_ajeno') {
      res.status(409).json({
        error: 'ingrediente_ajeno',
        mensaje: 'Uno de los ingredientes no pertenece a este restaurante.',
      })
      return
    }
    console.error('Error guardando la receta:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})


