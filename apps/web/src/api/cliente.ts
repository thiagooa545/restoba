import type { RespuestaBusqueda, RestauranteDetalle } from '@restoba/shared'

/** En desarrollo, Vite redirige /api a la API: un solo origen para el navegador. */
const BASE = '/api'

class ErrorApi extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message)
    this.name = 'ErrorApi'
  }
}

async function pedir<T>(ruta: string, senal?: AbortSignal): Promise<T> {
  const respuesta = await fetch(`${BASE}${ruta}`, { signal: senal })

  if (!respuesta.ok) {
    const cuerpo: unknown = await respuesta.json().catch(() => null)
    const codigo =
      cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo
        ? String((cuerpo as { error: unknown }).error)
        : `http_${respuesta.status}`
    throw new ErrorApi(codigo, respuesta.status)
  }

  return (await respuesta.json()) as T
}

export type FiltrosBusqueda = {
  cocina?: string
  q?: string
  lat?: number
  lng?: number
  radio?: number
  orden?: string
  precio?: number[]
  puntajeMinimo?: number
}

export function aQueryString(filtros: FiltrosBusqueda): string {
  const params = new URLSearchParams()
  if (filtros.cocina) params.set('cocina', filtros.cocina)
  if (filtros.q) params.set('q', filtros.q)
  if (filtros.lat !== undefined) params.set('lat', String(filtros.lat))
  if (filtros.lng !== undefined) params.set('lng', String(filtros.lng))
  if (filtros.radio !== undefined) params.set('radio', String(filtros.radio))
  if (filtros.orden) params.set('orden', filtros.orden)
  if (filtros.precio?.length) params.set('precio', filtros.precio.join(','))
  if (filtros.puntajeMinimo !== undefined) params.set('puntajeMinimo', String(filtros.puntajeMinimo))
  return params.toString()
}

export function buscar(filtros: FiltrosBusqueda, senal?: AbortSignal): Promise<RespuestaBusqueda> {
  return pedir<RespuestaBusqueda>(`/restaurantes?${aQueryString(filtros)}`, senal)
}

export function verRestaurante(
  id: number,
  ubicacion?: { lat: number; lng: number },
  senal?: AbortSignal,
): Promise<RestauranteDetalle> {
  const cola = ubicacion ? `?lat=${ubicacion.lat}&lng=${ubicacion.lng}` : ''
  return pedir<RestauranteDetalle>(`/restaurantes/${id}${cola}`, senal)
}

export type TipoCocina = { nombre: string; slug: string; cantidad: number }

export async function tiposDeCocina(senal?: AbortSignal): Promise<TipoCocina[]> {
  const { tipos } = await pedir<{ tipos: TipoCocina[] }>('/tipos-cocina', senal)
  return tipos
}

export { ErrorApi }
