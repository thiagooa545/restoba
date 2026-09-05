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
 * Proveedores de teselas. Ninguno de los dos pide clave de API ni tarjeta:
 * por eso se eligió Leaflet y no Google Maps.
 *
 * · carto — mapa claro, casi sin color. Es el que combina con el sistema de
 *   diseño y el que está por defecto.
 * · osm   — el mapa clásico de OpenStreetMap, más colorido. Sirve de respaldo
 *   si CARTO llegara a limitar el uso.
 *
 * Se cambia con VITE_MAPA_PROVEEDOR=osm en el .env de la raíz.
 */
const PROVEEDORES = {
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    atribucion:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
} as const

const elegido = import.meta.env.VITE_MAPA_PROVEEDOR
const TESELAS = elegido === 'osm' ? PROVEEDORES.osm : PROVEEDORES.carto

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
      {/* Teselas claras: no compiten con la interfaz ni con las fotos.
          Sin clave de API — ver PROVEEDORES arriba. */}
      <TileLayer
        url={TESELAS.url}
        attribution={TESELAS.atribucion}
        maxZoom={TESELAS.maxZoom}
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
          <Popup closeButton autoPan minWidth={252} maxWidth={252} offset={[0, -6]}>
            <article className="w-[252px]">
              <Foto className="h-[132px] rounded-t-[17px]" tamIcono={30} />

              <div className="px-4 pt-3.5 pb-4">
                <p className="volanta m-0 mb-2 text-tinta-3">
                  {r.cocinas.map((c) => c.nombre).join(' · ')}
                </p>

                <h3 className="m-0 mb-1 font-display text-[19px] leading-tight tracking-[-0.014em]">
                  {r.nombre}
                </h3>

                <p className="m-0 mb-3 text-[12.5px] text-tinta-3">
                  {[r.barrio, simbolosPrecio(r.rangoPrecio), formatearDistancia(r.distancia)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>

                <div className="mb-3.5 flex items-baseline gap-2">
                  <span className="font-display text-[22px] leading-none font-semibold text-vino">
                    {formatearPuntaje(r.calificacion) ?? 'Sin reseñas'}
                  </span>
                  {r.resenas > 0 && (
                    <span className="text-xs text-tinta-3">{r.resenas} reseñas</span>
                  )}
                  {r.abierto !== null && (
                    <span className={`ml-auto ${r.abierto ? 'chip chip-verde' : 'chip'}`}>
                      {r.abierto ? 'ABIERTO' : 'CERRADO'}
                    </span>
                  )}
                </div>

                <Link
                  to={`/restaurante/${r.id}`}
                  className="boton w-full rounded-[12px] !bg-tinta py-2.5 text-sm !text-papel no-underline"
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
