import { useCallback, useState } from 'react'

export type Coordenadas = { lat: number; lng: number }

export type EstadoUbicacion =
  | { estado: 'inicial' }
  | { estado: 'pidiendo' }
  | { estado: 'lista'; coords: Coordenadas }
  | { estado: 'denegada' }
  | { estado: 'no_disponible'; motivo: string }

/**
 * Geolocalización del navegador (RF-03).
 *
 * Nunca se pide sola: se dispara con una acción explícita del usuario, que es
 * lo que exige la Política de Privacidad (consentimiento expreso para
 * geolocalizar). Si la deniega, la búsqueda sigue andando ordenada por puntaje,
 * que es el flujo alternativo del CU-01.
 */
export function useUbicacion() {
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion>({ estado: 'inicial' })

  const pedir = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setUbicacion({ estado: 'no_disponible', motivo: 'Este navegador no puede darnos la ubicación.' })
      return
    }

    setUbicacion({ estado: 'pidiendo' })

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setUbicacion({
          estado: 'lista',
          coords: { lat: posicion.coords.latitude, lng: posicion.coords.longitude },
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setUbicacion({ estado: 'denegada' })
        } else {
          setUbicacion({
            estado: 'no_disponible',
            motivo:
              error.code === error.TIMEOUT
                ? 'Tardó demasiado en responder. Probá de nuevo.'
                : 'No pudimos obtener tu ubicación.',
          })
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [])

  const limpiar = useCallback(() => setUbicacion({ estado: 'inicial' }), [])

  return { ubicacion, pedir, limpiar }
}
