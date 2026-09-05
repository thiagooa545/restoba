import { z } from 'zod'

/** Criterios de orden del buscador (RF-04). */
export const ORDENES = ['cercania', 'puntaje', 'mixto'] as const
export type Orden = (typeof ORDENES)[number]

/**
 * Radios de búsqueda en metros, en escalera.
 * Si el primero no devuelve nada, la API prueba el siguiente y avisa que amplió
 * (flujo alternativo del CU-01: «si no hay resultados cercanos, ofrece ampliar el radio»).
 */
export const RADIOS = [1000, 3000, 10_000] as const

/** Parámetros de `GET /api/restaurantes`. */
export const busquedaSchema = z.object({
  /** Slug del tipo de cocina, por ejemplo `pastas`. */
  cocina: z.string().min(1).max(60).optional(),
  /** Texto libre sobre el nombre y el barrio. Ignora acentos y mayúsculas. */
  q: z.string().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  /** Radio en metros. Si no se manda y hay ubicación, la API lo resuelve en escalera. */
  radio: z.coerce.number().int().min(100).max(50_000).optional(),
  orden: z.enum(ORDENES).default('cercania'),
  /** Rangos de precio a incluir: 1, 2 o 3. */
  precio: z.array(z.coerce.number().int().min(1).max(3)).optional(),
  puntajeMinimo: z.coerce.number().min(1).max(5).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
})
export type Busqueda = z.infer<typeof busquedaSchema>

export type CocinaResumen = { nombre: string; slug: string }

export type RestauranteResultado = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string
  barrio: string | null
  lat: number
  lng: number
  rangoPrecio: number
  calificacion: number | null
  resenas: number
  cocinas: CocinaResumen[]
  /** Metros hasta el usuario. null si no compartió la ubicación. */
  distancia: number | null
  /** Calculado con los horarios del día, en hora de Buenos Aires. */
  abierto: boolean | null
  /** Hora de cierre del turno en curso, si está abierto. */
  cierraA: string | null
}

export type RespuestaBusqueda = {
  resultados: RestauranteResultado[]
  total: number
  /** Radio efectivamente usado, en metros. null si la búsqueda fue sin ubicación. */
  radioAplicado: number | null
  /** true si hubo que ampliar el radio porque el primero no devolvió nada. */
  radioAmpliado: boolean
  ordenAplicado: Orden
  conUbicacion: boolean
}

export type ProductoCarta = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  activo: boolean
  vegetariano: boolean
  sinTacc: boolean
  destacado: boolean
}

export type CategoriaCarta = {
  id: number
  nombre: string
  productos: ProductoCarta[]
}

export type HorarioDia = {
  dia: number
  turnos: { abre: string; cierra: string }[]
}

export type RestauranteDetalle = RestauranteResultado & {
  telefono: string | null
  ciudad: string
  horarios: HorarioDia[]
  carta: CategoriaCarta[]
}

export const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

/** Formatea metros como los muestra la interfaz: «480 m» o «1,6 km». */
export function formatearDistancia(metros: number | null): string | null {
  if (metros === null) return null
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`
}

/** Formatea la calificación con coma decimal. */
export function formatearPuntaje(valor: number | null): string | null {
  return valor === null ? null : valor.toFixed(1).replace('.', ',')
}

export function formatearPrecio(pesos: number): string {
  return pesos.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function simbolosPrecio(rango: number): string {
  return '$'.repeat(Math.max(1, Math.min(3, rango)))
}
