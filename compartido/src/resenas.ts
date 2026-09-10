import { z } from 'zod'

/**
 * Puntos que otorga cada acción (T&C art. 8).
 * Los Puntos no son dinero ni son transferibles: solo se canjean por Cupones.
 */
export const PUNTOS_POR_VISITA = 50
export const PUNTOS_POR_RESENA = 120

/**
 * Vigencia de los Puntos y de los Cupones, en meses.
 * Es otro de los `[COMPLETAR]` de los T&C: si cambia acá, hay que escribirlo
 * en el artículo 8 del documento.
 */
export const MESES_VIGENCIA_PUNTOS = 12
export const MESES_VIGENCIA_CUPON = 3

export const CATALOGO_CUPONES = [
  { id: 'cafe', titulo: 'Café de cortesía', puntos: 400 },
  { id: 'postre', titulo: 'Postre de la casa sin cargo', puntos: 800 },
  { id: 'entrada', titulo: 'Entrada para compartir sin cargo', puntos: 1500 },
] as const

export type ClaveCupon = (typeof CATALOGO_CUPONES)[number]['id']

export const nuevaResenaSchema = z.object({
  reservaId: z.coerce.number().int().positive(),
  puntuacion: z.coerce.number().int().min(1).max(5),
  comentario: z.string().trim().max(1500).optional(),
})
export type NuevaResena = z.infer<typeof nuevaResenaSchema>

export const canjeSchema = z.object({
  cupon: z.enum(['cafe', 'postre', 'entrada']),
})

export type Resena = {
  id: number
  autor: string
  puntuacion: number
  comentario: string | null
  fecha: string
  editada: boolean
  /** La reseña nació de una reserva registrada: por eso se muestra verificada. */
  verificada: boolean
  respuesta: string | null
  respuestaEn: string | null
  /** true si la escribió quien está mirando. */
  mia: boolean
}

export type ResumenResenas = {
  promedio: number | null
  total: number
  /** Cuántas reseñas hay de cada puntuación, de 1 a 5. */
  distribucion: Record<string, number>
}

/** Una visita pasada que todavía no tiene reseña. */
export type VisitaSinResenar = {
  reservaId: number
  restauranteId: number
  restaurante: string
  fecha: string
  hora: string
}

export type MovimientoPuntos = {
  id: number
  puntos: number
  motivo: 'visita' | 'resena' | 'canje'
  detalle: string | null
  restaurante: string | null
  fecha: string
}

export type Cupon = {
  id: number
  codigo: string
  titulo: string
  puntosGastados: number
  venceEn: string
  usado: boolean
  vencido: boolean
}

export type EstadoPuntos = {
  saldo: number
  acumuladoHistorico: number
  movimientos: MovimientoPuntos[]
  cupones: Cupon[]
  catalogo: { id: string; titulo: string; puntos: number; alcanza: boolean }[]
}

const MOTIVOS: Record<MovimientoPuntos['motivo'], string> = {
  visita: 'Visita completada',
  resena: 'Reseña publicada',
  canje: 'Canje de cupón',
}

export function nombreMotivo(motivo: MovimientoPuntos['motivo']): string {
  return MOTIVOS[motivo]
}

/** «12 de agosto de 2026» a partir de un ISO con o sin hora. */
export function fechaLarga(iso: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${d} de ${meses[m - 1]} de ${a}`
}
