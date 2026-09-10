import type {
  ComensalPublico,
  Disponibilidad,
  EstadoPuntos,
  Resena,
  Reserva,
  RestauranteResultado,
  ResumenResenas,
  VisitaSinResenar,
  DocumentoLegal,
  DocumentoLegalRespuesta,
  RespuestaBusqueda,
  RespuestaSesion,
  RestauranteDetalle,
} from '@restoba/compartido'

/** En desarrollo, Vite redirige /api a la API: un solo origen para el navegador. */
const BASE = '/api'

class ErrorApi extends Error {
  constructor(
    message: string,
    readonly estado: number,
    /** Texto para mostrarle al usuario, cuando la API lo manda. */
    readonly detalle?: string,
  ) {
    super(message)
    this.name = 'ErrorApi'
  }
}

/**
 * El token de acceso vive solo en memoria, nunca en localStorage: si lo
 * guardáramos ahí, cualquier script de la página podría leerlo. La sesión se
 * recupera al cargar con la cookie httpOnly, que sí es inaccesible desde JS.
 */
let tokenEnMemoria: string | null = null

export function guardarToken(token: string | null): void {
  tokenEnMemoria = token
}

type Opciones = {
  metodo?: 'GET' | 'POST'
  cuerpo?: unknown
  senal?: AbortSignal
  conToken?: boolean
}

async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, senal, conToken = false } = opciones
  const cabeceras: Record<string, string> = {}

  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (conToken && tokenEnMemoria) cabeceras['Authorization'] = `Bearer ${tokenEnMemoria}`

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    credentials: 'include',
    signal: senal,
  })

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => null)) as {
      error?: string
      mensaje?: string
      detalle?: { campo: string; mensaje: string }[]
    } | null

    throw new ErrorApi(
      datos?.error ?? `http_${respuesta.status}`,
      respuesta.status,
      datos?.mensaje ?? datos?.detalle?.map((d) => d.mensaje).join('. '),
    )
  }

  return (await respuesta.json()) as T
}

type FiltrosBusqueda = {
  cocina?: string
  q?: string
  lat?: number
  lng?: number
  radio?: number
  orden?: string
  precio?: number[]
  puntajeMinimo?: number
}

function aQueryString(filtros: FiltrosBusqueda): string {
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
  return pedir<RespuestaBusqueda>(`/restaurantes?${aQueryString(filtros)}`, { senal })
}

export function verRestaurante(
  id: number,
  ubicacion?: { lat: number; lng: number },
  senal?: AbortSignal,
): Promise<RestauranteDetalle> {
  const cola = ubicacion ? `?lat=${ubicacion.lat}&lng=${ubicacion.lng}` : ''
  return pedir<RestauranteDetalle>(`/restaurantes/${id}${cola}`, { senal })
}

export type TipoCocina = { nombre: string; slug: string; cantidad: number }

export async function tiposDeCocina(senal?: AbortSignal): Promise<TipoCocina[]> {
  const { tipos } = await pedir<{ tipos: TipoCocina[] }>('/tipos-cocina', { senal })
  return tipos
}

// ── Sesión ──────────────────────────────────────────────────

export function registrarse(datos: {
  nombre: string
  email: string
  password: string
  mayorDeEdad: true
}): Promise<RespuestaSesion> {
  return pedir<RespuestaSesion>('/auth/registro', { metodo: 'POST', cuerpo: datos })
}

export function ingresar(datos: { email: string; password: string }): Promise<RespuestaSesion> {
  return pedir<RespuestaSesion>('/auth/login', { metodo: 'POST', cuerpo: datos })
}

/** Recupera la sesión con la cookie httpOnly. Se llama al cargar la página. */
export function renovarSesion(senal?: AbortSignal): Promise<RespuestaSesion> {
  return pedir<RespuestaSesion>('/auth/refresh', { metodo: 'POST', senal })
}

export function salir(): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>('/auth/logout', { metodo: 'POST' })
}

// ── Verificación de la cuenta ───────────────────────────────

type ConComensal = { comensal: ComensalPublico; codigoDemo?: string }

export function reenviarCodigoEmail(): Promise<{ ok: boolean; codigoDemo?: string }> {
  return pedir('/cuenta/email/reenviar', { metodo: 'POST', conToken: true })
}

export function verificarEmail(codigo: string): Promise<ConComensal> {
  return pedir<ConComensal>('/cuenta/email/verificar', {
    metodo: 'POST',
    cuerpo: { codigo },
    conToken: true,
  })
}

export function guardarTelefono(telefono: string): Promise<ConComensal> {
  return pedir<ConComensal>('/cuenta/telefono', {
    metodo: 'POST',
    cuerpo: { telefono },
    conToken: true,
  })
}

export function verificarTelefono(codigo: string): Promise<ConComensal> {
  return pedir<ConComensal>('/cuenta/telefono/verificar', {
    metodo: 'POST',
    cuerpo: { codigo },
    conToken: true,
  })
}

// ── Marco legal ─────────────────────────────────────────────

export function documentoLegal(
  clave: DocumentoLegal,
  senal?: AbortSignal,
): Promise<DocumentoLegalRespuesta> {
  return pedir<DocumentoLegalRespuesta>(`/legal/${clave}`, { senal })
}

/** El hash viaja de vuelta: la API lo revalida contra el archivo del disco. */
export function aceptarDocumento(datos: {
  documento: DocumentoLegal
  version: string
  hash: string
}): Promise<ConComensal> {
  return pedir<ConComensal>('/legal/aceptacion', { metodo: 'POST', cuerpo: datos, conToken: true })
}

export function revocarAceptaciones(): Promise<ConComensal> {
  return pedir<ConComensal>('/legal/revocar', { metodo: 'POST', conToken: true })
}

// ── Reservas ────────────────────────────────────────────────

export function disponibilidad(
  restauranteId: number,
  fecha: string,
  personas: number,
  senal?: AbortSignal,
): Promise<Disponibilidad> {
  return pedir<Disponibilidad>(
    `/restaurantes/${restauranteId}/disponibilidad?fecha=${fecha}&personas=${personas}`,
    { senal },
  )
}

export function reservar(datos: {
  restauranteId: number
  fecha: string
  hora: string
  personas: number
  notas?: string
}): Promise<{ reserva: Reserva }> {
  return pedir('/reservas', { metodo: 'POST', cuerpo: datos, conToken: true })
}

export async function misReservas(senal?: AbortSignal): Promise<Reserva[]> {
  const { reservas } = await pedir<{ reservas: Reserva[] }>('/reservas/mias', {
    conToken: true,
    senal,
  })
  return reservas
}

export function cancelarReserva(id: number): Promise<{ reserva: Reserva }> {
  return pedir(`/reservas/${id}/cancelar`, { metodo: 'POST', conToken: true })
}

// ── Reseñas ─────────────────────────────────────────────────

export function resenasDe(
  restauranteId: number,
  senal?: AbortSignal,
): Promise<{ resenas: Resena[]; resumen: ResumenResenas }> {
  return pedir(`/restaurantes/${restauranteId}/resenas`, { conToken: true, senal })
}

export async function visitasSinResenar(
  restauranteId?: number,
  senal?: AbortSignal,
): Promise<VisitaSinResenar[]> {
  const cola = restauranteId ? `?restaurante=${restauranteId}` : ''
  const { visitas } = await pedir<{ visitas: VisitaSinResenar[] }>(`/resenas/pendientes${cola}`, {
    conToken: true,
    senal,
  })
  return visitas
}

export function publicarResena(datos: {
  reservaId: number
  puntuacion: number
  comentario?: string
}): Promise<{ id: number; puntosGanados: number }> {
  return pedir('/resenas', { metodo: 'POST', cuerpo: datos, conToken: true })
}

// ── Favoritos y puntos ──────────────────────────────────────

export function alternarFavorito(restauranteId: number): Promise<{ favorito: boolean }> {
  return pedir(`/favoritos/${restauranteId}`, { metodo: 'POST', conToken: true })
}

export function misFavoritos(
  senal?: AbortSignal,
): Promise<{ ids: number[]; restaurantes: RestauranteResultado[] }> {
  return pedir('/favoritos', { conToken: true, senal })
}

export function misPuntos(senal?: AbortSignal): Promise<EstadoPuntos> {
  return pedir('/puntos', { conToken: true, senal })
}

export function canjearPuntos(cupon: string): Promise<{ estado: EstadoPuntos }> {
  return pedir('/puntos/canjear', { metodo: 'POST', cuerpo: { cupon }, conToken: true })
}

export { ErrorApi }
