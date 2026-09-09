import { z } from 'zod'

/**
 * Una reserva ocupa la mesa por dos horas. Es el bloque que usan los turnos:
 * si alguien reserva a las 21:00, esa mesa no vuelve a ofrecerse hasta las 23:00.
 */
export const DURACION_RESERVA_MIN = 120

/** Los turnos se ofrecen cada media hora. */
export const PASO_TURNO_MIN = 30

/**
 * Hasta cuánto antes se puede cancelar sin consecuencias.
 * Este número es uno de los `[COMPLETAR]` de los T&C: al fijarlo acá hay que
 * escribirlo también en el artículo 9 del documento.
 */
export const HORAS_PARA_CANCELAR = 2

export const ESTADOS_RESERVA = ['confirmada', 'cancelada', 'cumplida', 'no_show'] as const
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number]

export const nuevaReservaSchema = z.object({
  restauranteId: z.coerce.number().int().positive(),
  /** AAAA-MM-DD */
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  /** HH:MM */
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  personas: z.coerce.number().int().min(1).max(20),
  notas: z.string().trim().max(300).optional(),
})
export type NuevaReserva = z.infer<typeof nuevaReservaSchema>

export const consultaDisponibilidadSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  personas: z.coerce.number().int().min(1).max(20).default(2),
})

export type Turno = {
  hora: string
  libre: boolean
  /** Mesas con capacidad suficiente que quedan sin reservar en ese turno. */
  mesasLibres: number
}

export type Disponibilidad = {
  fecha: string
  personas: number
  /** false cuando el local no atiende ese día. */
  abierto: boolean
  turnos: Turno[]
  /** Mayor capacidad que tiene el local, para avisar si el grupo no entra. */
  capacidadMaxima: number
}

export type Reserva = {
  id: number
  restauranteId: number
  restaurante: string
  direccion: string
  fecha: string
  hora: string
  personas: number
  estado: EstadoReserva
  notas: string | null
  mesa: string | null
  /** Calculado por la API contra la hora actual de Buenos Aires. */
  cancelable: boolean
  /** true cuando ya pasó: es lo que habilita reseñar (T&C art. 7.5). */
  cumplida: boolean
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/** «vie 12 de septiembre». Toma AAAA-MM-DD y no cae en el corrimiento de zona horaria. */
export function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  const fecha = new Date(a, m - 1, d)
  return `${DIAS_CORTOS[fecha.getDay()]} ${d} de ${MESES[m - 1]}`
}

/** Fecha de hoy en Buenos Aires, como AAAA-MM-DD. */
export function hoyEnBuenosAires(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return partes
}

/** Suma días a una fecha AAAA-MM-DD sin pasar por UTC. */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(a!, m! - 1, d! + dias)
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-')
}
