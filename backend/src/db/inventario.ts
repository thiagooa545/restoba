/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Las consultas del inventario. Es la respuesta al «¿quién carga el
   stock?» que nos preguntaron: lo carga el administrador, y estas son
   las operaciones que tiene disponibles.

   Dos ideas que conviene explicar:

   1. El stock nunca se cambia con un UPDATE suelto. Siempre se hace
      dentro de una transacción que escribe DOS cosas: el número nuevo
      en el ingrediente y el renglón en el libro de movimientos. O se
      guardan las dos o no se guarda ninguna. Si no fuera así, podría
      quedar un stock que nadie sabe de dónde salió.

   2. Un «ajuste» no es un delta, es un recuento. Cuando alguien cuenta
      lo que hay en la heladera escribe lo que contó, y el sistema
      calcula solo si eso sube o baja el stock. Pedirle al usuario que
      calcule la diferencia es pedirle que se equivoque.

   Y como todo el panel: cada consulta filtra por restaurante_id, que
   sale del usuario en sesión (RF-12).

   Responde a: RF-08.
   ════════════════════════════════════════════════════════════════════ */

import type {
  Ingrediente,
  MotivoMovimiento,
  MovimientoStock,
  RecetaProducto,
  Unidad,
} from '@restoba/compartido'
import { consultar, consultarUna, enTransaccion } from './pool.js'

type FilaIngrediente = {
  id: number
  nombre: string
  unidad: Unidad
  stock_actual: string
  stock_minimo: string
  costo_unitario: string | null
  activo: boolean
  en_recetas: number
  actualizado_en: Date
}

function aIngrediente(f: FilaIngrediente): Ingrediente {
  const stockActual = Number(f.stock_actual)
  const stockMinimo = Number(f.stock_minimo)
  return {
    id: f.id,
    nombre: f.nombre,
    unidad: f.unidad,
    stockActual,
    stockMinimo,
    costoUnitario: f.costo_unitario === null ? null : Number(f.costo_unitario),
    activo: f.activo,
    bajoMinimo: stockActual <= stockMinimo,
    enRecetas: f.en_recetas,
    actualizadoEn: f.actualizado_en.toISOString(),
  }
}

export async function listarIngredientes(restauranteId: number): Promise<Ingrediente[]> {
  const filas = await consultar<FilaIngrediente>(
    `SELECT i.id, i.nombre, i.unidad, i.stock_actual, i.stock_minimo,
            i.costo_unitario, i.activo, i.actualizado_en,
            (SELECT count(*)::int FROM producto_ingrediente pi WHERE pi.ingrediente_id = i.id)
              AS en_recetas
     FROM   ingrediente i
     WHERE  i.restaurante_id = $1
     -- Los que están bajo el mínimo van primero: es lo que hay que reponer.
     ORDER BY (i.stock_actual <= i.stock_minimo) DESC, i.nombre`,
    [restauranteId],
  )
  return filas.map(aIngrediente)
}

export function contarBajoMinimo(restauranteId: number): Promise<{ cantidad: number } | null> {
  return consultarUna<{ cantidad: number }>(
    `SELECT count(*)::int AS cantidad
     FROM   ingrediente
     WHERE  restaurante_id = $1 AND activo = true AND stock_actual <= stock_minimo`,
    [restauranteId],
  )
}

/**
 * Crea el ingrediente y, si arranca con stock, deja el movimiento inicial.
 * Así hasta la primera carga queda registrada: el libro no empieza a la mitad.
 */
export async function crearIngrediente(datos: {
  restauranteId: number
  usuarioId: number
  nombre: string
  unidad: Unidad
  stockInicial: number
  stockMinimo: number
  costoUnitario?: number
}): Promise<Ingrediente> {
  const id = await enTransaccion(async (cliente) => {
    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO ingrediente
         (restaurante_id, nombre, unidad, stock_actual, stock_minimo, costo_unitario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        datos.restauranteId,
        datos.nombre,
        datos.unidad,
        datos.stockInicial,
        datos.stockMinimo,
        datos.costoUnitario ?? null,
      ],
    )
    const nuevoId = rows[0]!.id

    if (datos.stockInicial > 0) {
      await cliente.query(
        `INSERT INTO movimiento_stock
           (restaurante_id, ingrediente_id, cantidad, motivo, saldo, usuario_id, nota)
         VALUES ($1, $2, $3, 'inicial', $3, $4, 'Carga inicial del ingrediente')`,
        [datos.restauranteId, nuevoId, datos.stockInicial, datos.usuarioId],
      )
    }

    return nuevoId
  })

  const creado = await obtenerIngrediente(id, datos.restauranteId)
  if (!creado) throw new Error('No se pudo leer el ingrediente recién creado')
  return creado
}

export async function obtenerIngrediente(
  id: number,
  restauranteId: number,
): Promise<Ingrediente | null> {
  const fila = await consultarUna<FilaIngrediente>(
    `SELECT i.id, i.nombre, i.unidad, i.stock_actual, i.stock_minimo,
            i.costo_unitario, i.activo, i.actualizado_en,
            (SELECT count(*)::int FROM producto_ingrediente pi WHERE pi.ingrediente_id = i.id)
              AS en_recetas
     FROM   ingrediente i
     WHERE  i.id = $1 AND i.restaurante_id = $2`,
    [id, restauranteId],
  )
  return fila ? aIngrediente(fila) : null
}

export async function editarIngrediente(
  id: number,
  restauranteId: number,
  cambios: { nombre?: string; stockMinimo?: number; costoUnitario?: number | null; activo?: boolean },
): Promise<Ingrediente | null> {
  const campos: string[] = []
  const valores: unknown[] = [id, restauranteId]

  const agregar = (columna: string, valor: unknown) => {
    valores.push(valor)
    campos.push(`${columna} = $${valores.length}`)
  }

  if (cambios.nombre !== undefined) agregar('nombre', cambios.nombre)
  if (cambios.stockMinimo !== undefined) agregar('stock_minimo', cambios.stockMinimo)
  if (cambios.costoUnitario !== undefined) agregar('costo_unitario', cambios.costoUnitario)
  if (cambios.activo !== undefined) agregar('activo', cambios.activo)

  if (campos.length === 0) return obtenerIngrediente(id, restauranteId)

  await consultar(
    `UPDATE ingrediente SET ${campos.join(', ')}, actualizado_en = now()
     WHERE id = $1 AND restaurante_id = $2`,
    valores,
  )

  return obtenerIngrediente(id, restauranteId)
}

export type ResultadoMovimiento =
  | { ok: true; ingrediente: Ingrediente }
  | { ok: false; motivo: 'no_encontrado' | 'stock_insuficiente'; disponible?: number }

/**
 * Registra un movimiento de stock.
 *
 * `cantidad` viene siempre en positivo; el motivo decide qué significa:
 * compra suma, merma resta, y ajuste es el recuento físico (el valor final).
 */
export async function registrarMovimiento(datos: {
  ingredienteId: number
  restauranteId: number
  usuarioId: number
  cantidad: number
  motivo: Extract<MotivoMovimiento, 'compra' | 'ajuste' | 'merma'>
  nota?: string
}): Promise<ResultadoMovimiento> {
  const resultado = await enTransaccion(async (cliente) => {
    // FOR UPDATE: si dos personas del local mueven el mismo ingrediente a la
    // vez, la segunda espera y trabaja sobre el número ya actualizado.
    const { rows } = await cliente.query<{ stock_actual: string }>(
      `SELECT stock_actual FROM ingrediente
       WHERE id = $1 AND restaurante_id = $2
       FOR UPDATE`,
      [datos.ingredienteId, datos.restauranteId],
    )

    if (rows.length === 0) return { ok: false as const, motivo: 'no_encontrado' as const }

    const actual = Number(rows[0]!.stock_actual)
    const delta =
      datos.motivo === 'compra'
        ? datos.cantidad
        : datos.motivo === 'merma'
          ? -datos.cantidad
          : datos.cantidad - actual // ajuste: la cantidad es el recuento

    const saldo = actual + delta

    if (saldo < 0) {
      return { ok: false as const, motivo: 'stock_insuficiente' as const, disponible: actual }
    }

    // Un ajuste que no cambia nada no se registra: ensuciaría el libro.
    if (delta !== 0) {
      await cliente.query(
        `UPDATE ingrediente SET stock_actual = $3, actualizado_en = now()
         WHERE id = $1 AND restaurante_id = $2`,
        [datos.ingredienteId, datos.restauranteId, saldo],
      )

      await cliente.query(
        `INSERT INTO movimiento_stock
           (restaurante_id, ingrediente_id, cantidad, motivo, saldo, usuario_id, nota)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          datos.restauranteId,
          datos.ingredienteId,
          delta,
          datos.motivo,
          saldo,
          datos.usuarioId,
          datos.nota ?? null,
        ],
      )
    }

    return { ok: true as const }
  })

  if (!resultado.ok) return resultado

  const ingrediente = await obtenerIngrediente(datos.ingredienteId, datos.restauranteId)
  if (!ingrediente) return { ok: false, motivo: 'no_encontrado' }
  return { ok: true, ingrediente }
}

export async function historial(
  restauranteId: number,
  limite = 60,
): Promise<MovimientoStock[]> {
  const filas = await consultar<{
    id: number
    ingrediente: string
    unidad: Unidad
    cantidad: string
    motivo: MotivoMovimiento
    saldo: string
    usuario: string | null
    nota: string | null
    creado_en: Date
  }>(
    `SELECT m.id, i.nombre AS ingrediente, i.unidad, m.cantidad, m.motivo, m.saldo,
            u.nombre AS usuario, m.nota, m.creado_en
     FROM   movimiento_stock m
     JOIN   ingrediente i ON i.id = m.ingrediente_id
     LEFT JOIN usuario u ON u.id = m.usuario_id
     WHERE  m.restaurante_id = $1
     ORDER BY m.creado_en DESC, m.id DESC
     LIMIT  $2`,
    [restauranteId, limite],
  )

  return filas.map((f) => ({
    id: f.id,
    ingrediente: f.ingrediente,
    unidad: f.unidad,
    cantidad: Number(f.cantidad),
    motivo: f.motivo,
    saldo: Number(f.saldo),
    usuario: f.usuario,
    nota: f.nota,
    creadoEn: f.creado_en.toISOString(),
  }))
}

// ── Recetas ─────────────────────────────────────────────────

/**
 * La receta de un plato y cuántas porciones se pueden hacer con el stock
 * de hoy. El límite lo pone el ingrediente que primero se acaba, así que
 * es el mínimo de todos, no el promedio.
 */
export async function obtenerReceta(
  productoId: number,
  restauranteId: number,
): Promise<RecetaProducto | null> {
  const producto = await consultarUna<{ id: number; nombre: string; activo: boolean }>(
    'SELECT id, nombre, activo FROM producto WHERE id = $1 AND restaurante_id = $2',
    [productoId, restauranteId],
  )
  if (!producto) return null

  const items = await consultar<{
    ingrediente_id: number
    ingrediente: string
    unidad: Unidad
    cantidad: string
    stock_actual: string
  }>(
    `SELECT pi.ingrediente_id, i.nombre AS ingrediente, i.unidad,
            pi.cantidad, i.stock_actual
     FROM   producto_ingrediente pi
     JOIN   ingrediente i ON i.id = pi.ingrediente_id
     WHERE  pi.producto_id = $1 AND i.restaurante_id = $2
     ORDER BY i.nombre`,
    [productoId, restauranteId],
  )

  const lista = items.map((i) => ({
    ingredienteId: i.ingrediente_id,
    ingrediente: i.ingrediente,
    unidad: i.unidad,
    cantidad: Number(i.cantidad),
    stockActual: Number(i.stock_actual),
  }))

  const porcionesPosibles =
    lista.length === 0
      ? null
      : Math.floor(Math.min(...lista.map((i) => i.stockActual / i.cantidad)))

  return {
    productoId: producto.id,
    producto: producto.nombre,
    activo: producto.activo,
    items: lista,
    porcionesPosibles,
  }
}

/** Reemplaza la receta entera. Es más simple y seguro que ir item por item. */
export async function guardarReceta(
  productoId: number,
  restauranteId: number,
  items: { ingredienteId: number; cantidad: number }[],
): Promise<RecetaProducto | null> {
  await enTransaccion(async (cliente) => {
    const { rowCount } = await cliente.query(
      'SELECT 1 FROM producto WHERE id = $1 AND restaurante_id = $2',
      [productoId, restauranteId],
    )
    if (!rowCount) throw new Error('producto_no_encontrado')

    await cliente.query('DELETE FROM producto_ingrediente WHERE producto_id = $1', [productoId])

    for (const item of items) {
      // El ingrediente tiene que ser del mismo local: si no, una receta podría
      // apuntar al depósito de otro restaurante.
      const { rowCount: valido } = await cliente.query(
        'SELECT 1 FROM ingrediente WHERE id = $1 AND restaurante_id = $2',
        [item.ingredienteId, restauranteId],
      )
      if (!valido) throw new Error('ingrediente_ajeno')

      await cliente.query(
        `INSERT INTO producto_ingrediente (producto_id, ingrediente_id, cantidad)
         VALUES ($1, $2, $3)`,
        [productoId, item.ingredienteId, item.cantidad],
      )
    }
  })

  return obtenerReceta(productoId, restauranteId)
}

/** Los platos de la carta, con cuántos ingredientes tiene cargada su receta. */
export function platosConReceta(restauranteId: number): Promise<
  { id: number; nombre: string; categoria: string; activo: boolean; ingredientes: number }[]
> {
  return consultar(
    `SELECT p.id, p.nombre, c.nombre AS categoria, p.activo,
            (SELECT count(*)::int FROM producto_ingrediente pi WHERE pi.producto_id = p.id)
              AS ingredientes
     FROM   producto p
     JOIN   categoria c ON c.id = p.categoria_id
     WHERE  p.restaurante_id = $1
     ORDER BY c.orden, p.orden`,
    [restauranteId],
  )
}
