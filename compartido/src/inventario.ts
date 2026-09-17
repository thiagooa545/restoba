import { z } from 'zod'

/**
 * Unidades en que se lleva el depósito. Son pocas a propósito: cuantas más
 * unidades se admiten, más fácil es cargar «0,5 l» de algo que se compra por
 * kilo y que la cuenta quede mal.
 */
export const UNIDADES = ['kg', 'g', 'l', 'ml', 'unidad', 'docena', 'atado'] as const
export type Unidad = (typeof UNIDADES)[number]

export const NOMBRE_UNIDAD: Record<Unidad, string> = {
  kg: 'kilos',
  g: 'gramos',
  l: 'litros',
  ml: 'mililitros',
  unidad: 'unidades',
  docena: 'docenas',
  atado: 'atados',
}

/** Por qué se movió el stock. El signo de la cantidad dice si entra o sale. */
export const MOTIVOS = ['compra', 'ajuste', 'consumo', 'merma', 'inicial'] as const
export type MotivoMovimiento = (typeof MOTIVOS)[number]

export const NOMBRE_MOTIVO: Record<MotivoMovimiento, string> = {
  compra: 'Compra',
  ajuste: 'Ajuste de inventario',
  consumo: 'Consumo por pedidos',
  merma: 'Merma',
  inicial: 'Carga inicial',
}

export type Ingrediente = {
  id: number
  nombre: string
  unidad: Unidad
  stockActual: number
  stockMinimo: number
  costoUnitario: number | null
  activo: boolean
  /** true cuando el stock llegó o bajó del mínimo: es la alerta del panel. */
  bajoMinimo: boolean
  /** Cuántos platos de la carta lo usan. Sirve para no borrar algo en uso. */
  enRecetas: number
  actualizadoEn: string
}

export type MovimientoStock = {
  id: number
  ingrediente: string
  unidad: Unidad
  cantidad: number
  motivo: MotivoMovimiento
  saldo: number
  usuario: string | null
  nota: string | null
  creadoEn: string
}

export type ItemReceta = {
  ingredienteId: number
  ingrediente: string
  unidad: Unidad
  cantidad: number
  /** Stock que queda de ese ingrediente, para ver si el plato se puede hacer. */
  stockActual: number
}

export type RecetaProducto = {
  productoId: number
  producto: string
  activo: boolean
  items: ItemReceta[]
  /** Cuántas porciones se pueden preparar con el stock de hoy. */
  porcionesPosibles: number | null
}

// ── Lo que manda el panel ───────────────────────────────────

export const nuevoIngredienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Poné el nombre del ingrediente').max(120),
  unidad: z.enum(UNIDADES),
  stockInicial: z.coerce.number().min(0, 'No puede ser negativo').max(999_999),
  stockMinimo: z.coerce.number().min(0, 'No puede ser negativo').max(999_999),
  costoUnitario: z.coerce.number().min(0).max(99_999_999).optional(),
})

export const editarIngredienteSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  stockMinimo: z.coerce.number().min(0).max(999_999).optional(),
  costoUnitario: z.coerce.number().min(0).max(99_999_999).nullable().optional(),
  activo: z.boolean().optional(),
})

/**
 * Un movimiento de stock. La cantidad va siempre en positivo y el motivo
 * decide qué se hace con ella, así el formulario no puede equivocarse de signo:
 *
 *   compra  suma al depósito
 *   merma   resta (se rompió, se venció, se tiró)
 *   ajuste  es un recuento físico: la cantidad ES el valor final, no un delta.
 *           Cuando alguien cuenta lo que hay en la heladera, escribe lo que
 *           contó; que eso suba o baje el stock lo calcula el sistema.
 */
export const movimientoSchema = z.object({
  cantidad: z.coerce.number().min(0, 'No puede ser negativo').max(999_999),
  motivo: z.enum(['compra', 'ajuste', 'merma']),
  nota: z.string().trim().max(300).optional(),
})

export const recetaSchema = z.object({
  items: z
    .array(
      z.object({
        ingredienteId: z.coerce.number().int().positive(),
        cantidad: z.coerce.number().positive('La cantidad tiene que ser mayor que cero'),
      }),
    )
    .max(40, 'Una receta de más de 40 ingredientes seguro es un error'),
})

/** Formatea una cantidad sin decimales de más: 1,5 kg pero 3 unidades. */
export function formatearCantidad(valor: number, unidad: Unidad): string {
  const numero = Number.isInteger(valor)
    ? String(valor)
    : valor.toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',')
  return `${numero} ${unidad}`
}
