import { z } from 'zod'

/**
 * La carta vista desde el panel del restaurante. Es la misma tabla que lee el
 * perfil público: no hay una copia para administrar y otra para mostrar. Por eso
 * un cambio acá se ve en la web en cuanto el comensal recarga, sin ningún paso
 * de publicación ni sincronización que pueda quedar a medias.
 */
export type ProductoGestion = {
  id: number
  categoriaId: number
  nombre: string
  descripcion: string | null
  precio: number
  activo: boolean
  vegetariano: boolean
  sinTacc: boolean
  destacado: boolean
  orden: number
  /** Cuántos ingredientes tiene cargada su receta. Cero es «sin receta». */
  enRecetas: number
  /** true cuando algún ingrediente de la receta no alcanza para una porción. */
  sinStock: boolean
}

export type CategoriaGestion = {
  id: number
  nombre: string
  orden: number
  productos: ProductoGestion[]
}

// ── Lo que manda el panel ───────────────────────────────────

export const nuevaCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, 'Poné el nombre de la sección').max(80),
})

export const editarCategoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  orden: z.coerce.number().int().min(0).max(99).optional(),
})

const precio = z.coerce
  .number()
  .min(0, 'El precio no puede ser negativo')
  .max(99_999_999, 'Ese precio no puede ser correcto')

export const nuevoProductoSchema = z.object({
  categoriaId: z.coerce.number().int().positive(),
  nombre: z.string().trim().min(2, 'Poné el nombre del plato').max(120),
  descripcion: z.string().trim().max(400).optional(),
  precio,
  vegetariano: z.boolean().optional(),
  sinTacc: z.boolean().optional(),
  destacado: z.boolean().optional(),
})

export const editarProductoSchema = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
  nombre: z.string().trim().min(2).max(120).optional(),
  descripcion: z.string().trim().max(400).nullable().optional(),
  precio: precio.optional(),
  activo: z.boolean().optional(),
  vegetariano: z.boolean().optional(),
  sinTacc: z.boolean().optional(),
  destacado: z.boolean().optional(),
})
