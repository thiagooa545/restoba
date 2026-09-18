/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Las consultas de la carta desde el panel del restaurante.

   Lo que hay que señalar acá es lo que NO hay: no existe una tabla
   «carta_publicada» ni un paso de publicación. El panel escribe sobre
   las mismas tablas `categoria` y `producto` que lee el perfil público.
   Por eso un cambio de precio se ve en la web apenas el comensal
   recarga, sin sincronización de por medio.

   Es una decisión, no una casualidad: mantener dos copias del menú
   obligaría a sincronizarlas, y toda sincronización termina fallando
   alguna vez y mostrando un precio viejo. Una sola tabla no puede
   desincronizarse de sí misma.

   Todas las funciones reciben restauranteId y lo usan en el WHERE. Ese
   dato sale siempre del token de la sesión, nunca de la URL: es el
   aislamiento multiempresa (RF-12).

   Responde a: RF-08 (gestión de la carta) y RF-12.
   ════════════════════════════════════════════════════════════════════ */

import type { CategoriaGestion, ProductoGestion } from '@restoba/compartido'
import { consultar, consultarUna, enTransaccion } from './pool.js'

type FilaProducto = {
  id: number
  categoria_id: number
  nombre: string
  descripcion: string | null
  precio: string
  activo: boolean
  vegetariano: boolean
  sin_tacc: boolean
  destacado: boolean
  orden: number
  en_recetas: number
  sin_stock: boolean
}

function aProducto(f: FilaProducto): ProductoGestion {
  return {
    id: f.id,
    categoriaId: f.categoria_id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    precio: Number(f.precio),
    activo: f.activo,
    vegetariano: f.vegetariano,
    sinTacc: f.sin_tacc,
    destacado: f.destacado,
    orden: f.orden,
    enRecetas: f.en_recetas,
    sinStock: f.sin_stock,
  }
}

/** Los mismos dos datos calculados que ve el comensal, para no discrepar. */
const CALCULADOS = `
  (SELECT count(*)::int FROM producto_ingrediente pi WHERE pi.producto_id = p.id) AS en_recetas,
  EXISTS (
    SELECT 1 FROM producto_ingrediente pi
    JOIN   ingrediente i ON i.id = pi.ingrediente_id
    WHERE  pi.producto_id = p.id AND i.stock_actual < pi.cantidad
  ) AS sin_stock`

export async function verCarta(restauranteId: number): Promise<CategoriaGestion[]> {
  const [categorias, productos] = await Promise.all([
    consultar<{ id: number; nombre: string; orden: number }>(
      'SELECT id, nombre, orden FROM categoria WHERE restaurante_id = $1 ORDER BY orden, id',
      [restauranteId],
    ),
    consultar<FilaProducto>(
      `SELECT p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.activo,
              p.vegetariano, p.sin_tacc, p.destacado, p.orden, ${CALCULADOS}
       FROM   producto p
       WHERE  p.restaurante_id = $1
       ORDER BY p.orden, p.id`,
      [restauranteId],
    ),
  ])

  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    orden: c.orden,
    productos: productos.filter((p) => p.categoria_id === c.id).map(aProducto),
  }))
}

// ── Secciones de la carta ───────────────────────────────────

export async function crearCategoria(
  restauranteId: number,
  nombre: string,
): Promise<CategoriaGestion> {
  const fila = await consultarUna<{ id: number; nombre: string; orden: number }>(
    `INSERT INTO categoria (restaurante_id, nombre, orden)
     VALUES ($1, $2, (SELECT coalesce(max(orden) + 1, 0) FROM categoria WHERE restaurante_id = $1))
     RETURNING id, nombre, orden`,
    [restauranteId, nombre],
  )
  return { ...fila!, productos: [] }
}

export async function editarCategoria(
  id: number,
  restauranteId: number,
  datos: { nombre?: string; orden?: number },
): Promise<{ id: number; nombre: string; orden: number } | null> {
  return consultarUna(
    `UPDATE categoria
     SET    nombre = coalesce($3, nombre), orden = coalesce($4, orden)
     WHERE  id = $1 AND restaurante_id = $2
     RETURNING id, nombre, orden`,
    [id, restauranteId, datos.nombre ?? null, datos.orden ?? null],
  )
}

/**
 * Borra una sección solo si está vacía. Si tiene platos, no se borra en
 * cascada: sería perder la carta por un clic. El panel pide moverlos primero.
 */
export async function borrarCategoria(
  id: number,
  restauranteId: number,
): Promise<'ok' | 'no_encontrada' | 'tiene_productos'> {
  const cuantos = await consultarUna<{ n: number }>(
    'SELECT count(*)::int AS n FROM producto WHERE categoria_id = $1 AND restaurante_id = $2',
    [id, restauranteId],
  )
  if ((cuantos?.n ?? 0) > 0) return 'tiene_productos'

  const borrada = await consultarUna<{ id: number }>(
    'DELETE FROM categoria WHERE id = $1 AND restaurante_id = $2 RETURNING id',
    [id, restauranteId],
  )
  return borrada ? 'ok' : 'no_encontrada'
}

// ── Platos ──────────────────────────────────────────────────

type DatosNuevo = {
  categoriaId: number
  nombre: string
  descripcion?: string
  precio: number
  vegetariano?: boolean
  sinTacc?: boolean
  destacado?: boolean
}

export async function crearProducto(
  restauranteId: number,
  datos: DatosNuevo,
): Promise<ProductoGestion | 'categoria_ajena'> {
  return enTransaccion(async (cliente) => {
    // La sección tiene que ser de este local. Sin este control, alguien podría
    // colgar un plato de la carta de otro restaurante mandando otro id.
    const { rows: cat } = await cliente.query<{ id: number }>(
      'SELECT id FROM categoria WHERE id = $1 AND restaurante_id = $2',
      [datos.categoriaId, restauranteId],
    )
    if (cat.length === 0) return 'categoria_ajena' as const

    const { rows } = await cliente.query<FilaProducto>(
      `INSERT INTO producto
         (restaurante_id, categoria_id, nombre, descripcion, precio,
          vegetariano, sin_tacc, destacado, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               (SELECT coalesce(max(orden) + 1, 0) FROM producto WHERE categoria_id = $2))
       RETURNING id, categoria_id, nombre, descripcion, precio, activo,
                 vegetariano, sin_tacc, destacado, orden, 0 AS en_recetas,
                 false AS sin_stock`,
      [
        restauranteId,
        datos.categoriaId,
        datos.nombre,
        datos.descripcion ?? null,
        datos.precio,
        datos.vegetariano ?? false,
        datos.sinTacc ?? false,
        datos.destacado ?? false,
      ],
    )
    return aProducto(rows[0]!)
  })
}

type DatosEdicion = {
  categoriaId?: number
  nombre?: string
  descripcion?: string | null
  precio?: number
  activo?: boolean
  vegetariano?: boolean
  sinTacc?: boolean
  destacado?: boolean
}

export async function editarProducto(
  id: number,
  restauranteId: number,
  datos: DatosEdicion,
): Promise<ProductoGestion | 'no_encontrado' | 'categoria_ajena'> {
  return enTransaccion(async (cliente) => {
    if (datos.categoriaId !== undefined) {
      const { rows: cat } = await cliente.query(
        'SELECT id FROM categoria WHERE id = $1 AND restaurante_id = $2',
        [datos.categoriaId, restauranteId],
      )
      if (cat.length === 0) return 'categoria_ajena' as const
    }

    // coalesce deja pasar solo los campos que el panel mandó: lo que no viene
    // queda como estaba. La descripción es la excepción, porque vaciarla a
    // propósito es un cambio válido y hay que poder distinguirlo de «no la toqué».
    const { rows } = await cliente.query<FilaProducto>(
      `UPDATE producto p
       SET    categoria_id = coalesce($3, categoria_id),
              nombre       = coalesce($4, nombre),
              descripcion  = CASE WHEN $5::boolean THEN $6 ELSE descripcion END,
              precio       = coalesce($7, precio),
              activo       = coalesce($8, activo),
              vegetariano  = coalesce($9, vegetariano),
              sin_tacc     = coalesce($10, sin_tacc),
              destacado    = coalesce($11, destacado)
       WHERE  p.id = $1 AND p.restaurante_id = $2
       RETURNING p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.activo,
                 p.vegetariano, p.sin_tacc, p.destacado, p.orden, ${CALCULADOS}`,
      [
        id,
        restauranteId,
        datos.categoriaId ?? null,
        datos.nombre ?? null,
        'descripcion' in datos,
        datos.descripcion ?? null,
        datos.precio ?? null,
        datos.activo ?? null,
        datos.vegetariano ?? null,
        datos.sinTacc ?? null,
        datos.destacado ?? null,
      ],
    )
    return rows.length === 0 ? ('no_encontrado' as const) : aProducto(rows[0]!)
  })
}

export async function borrarProducto(id: number, restauranteId: number): Promise<boolean> {
  const fila = await consultarUna<{ id: number }>(
    'DELETE FROM producto WHERE id = $1 AND restaurante_id = $2 RETURNING id',
    [id, restauranteId],
  )
  return fila !== null
}
