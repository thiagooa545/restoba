import {
  formatearDistancia,
  formatearPuntaje,
  simbolosPrecio,
  type RestauranteResultado,
} from '@restoba/shared'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import type { Coordenadas } from '../hooks/useUbicacion'
import { Foto } from './Foto'

/** Obelisco: centro por defecto cuando no hay ubicación ni resultados. */
const CENTRO_CABA: [number, number] = [-34.6037, -58.3816]

/**
 * Marcador con burbuja de puntaje, al estilo de los mapas inmobiliarios:
 * el dato importante se lee sin abrir nada.
 */
function iconoResto(resto: RestauranteResultado, activo: boolean): L.DivIcon {
  const punt = formatearPuntaje(resto.calificacion) ?? '—'
  const meta = [simbolosPrecio(resto.rangoPrecio), formatearDistancia(resto.distancia)]
    .filter(Boolean)
    .join(' · ')

  return L.divIcon({
    className: `pin-resto${activo ? ' pin-activo' : ''}`,
    html: `<div class="pin-burbuja"><span class="pin-punt">${punt}</span><span class="pin-meta">${meta}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

const iconoYo = L.divIcon({
  className: 'pin-yo',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/** Encuadra el mapa cuando cambian los resultados. */
function Encuadrar({
  puntos,
  seleccionado,
}: {
  puntos: [number, number][]
  seleccionado: RestauranteResultado | null
}) {
  const mapa = useMap()

  useEffect(() => {
    if (seleccionado) {
      mapa.setView([seleccionado.lat, seleccionado.lng], Math.max(mapa.getZoom(), 15), {
        animate: true,
      })
      return
    }
    if (puntos.length === 0) return
    if (puntos.length === 1) {
      mapa.setView(puntos[0]!, 15)
      return
    }
    mapa.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 16 })
  }, [mapa, puntos, seleccionado])

  return null
}

export function Mapa({
  resultados,
  ubicacion,
  seleccionado,
  onSeleccionar,
  className = '',
}: {
  resultados: RestauranteResultado[]
  ubicacion: Coordenadas | null
  seleccionado: number | null
  onSeleccionar: (id: number | null) => void
  className?: string
}) {
  const puntos = useMemo<[number, number][]>(() => {
    const p = resultados.map((r) => [r.lat, r.lng] as [number, number])
    if (ubicacion) p.push([ubicacion.lat, ubicacion.lng])
    return p
  }, [resultados, ubicacion])

  const activo = resultados.find((r) => r.id === seleccionado) ?? null

  return (
    <MapContainer
      center={ubicacion ? [ubicacion.lat, ubicacion.lng] : CENTRO_CABA}
      zoom={14}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
    >
      {/* Teselas claras de CARTO: no compiten con la interfaz ni con las fotos. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />

      <Encuadrar puntos={puntos} seleccionado={activo} />

      {ubicacion && (
        <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoYo} interactive={false} />
      )}

      {resultados.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={iconoResto(r, r.id === seleccionado)}
          eventHandlers={{
            click: () => onSeleccionar(r.id),
            popupclose: () => onSeleccionar(null),
          }}
        >
          <Popup closeButton autoPan>
            <article className="w-[196px]">
              <Foto className="h-24 rounded-t-[11px]" tamIcono={26} />
              <div className="px-3.5 pt-3 pb-3.5">
                <p className="volanta m-0 mb-1.5 text-tinta-3">
                  {r.cocinas.map((c) => c.nombre).join(' · ')}
                </p>
                <h3 className="m-0 mb-1 font-display text-[17px] leading-tight">{r.nombre}</h3>
                <p className="m-0 mb-2 text-xs text-tinta-3">
                  {[r.barrio, simbolosPrecio(r.rangoPrecio), formatearDistancia(r.distancia)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="font-display text-xl leading-none font-semibold text-vino">
                    {formatearPuntaje(r.calificacion) ?? 'Sin reseñas'}
                  </span>
                  {r.resenas > 0 && (
                    <span className="text-[11.5px] text-tinta-3">{r.resenas} reseñas</span>
                  )}
                </div>
                <Link
                  to={`/restaurante/${r.id}`}
                  className="boton boton-chico w-full !bg-tinta !text-papel no-underline"
                >
                  Ver restaurante
                </Link>
              </div>
            </article>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
