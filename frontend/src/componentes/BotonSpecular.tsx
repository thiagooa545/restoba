/* ════════════════════════════════════════════════════════════════════
   LA CARPETA  frontend/src/componentes/

   Las piezas que se repiten en varias pantallas. Se escriben una vez y se usan
   donde haga falta.

   Por qué: el encabezado aparece en las siete pantallas. Si estuviera copiado en
   cada una, cambiar un enlace del menú significaría tocar siete archivos y
   alguno quedaría distinto.

   Qué hay en cada archivo:

     BotonSpecular.tsx ← este. El botón con el reflejo que sigue al cursor.
     Encabezado.tsx    La barra superior, con el estado de la sesión.
     Mapa.tsx          El mapa con Leaflet y los marcadores.
     GateLegal.tsx     La pantalla de aceptación del marco legal.
     Reservar.tsx      El panel que elige fecha, personas y turno.
     Resenas.tsx       Escribir y leer reseñas.
     MisReservas.tsx   Las reservas del usuario, con la cancelación.
     Puntos.tsx        El saldo de puntos y el canje de cupones.
     Foto.tsx          El marco donde van las fotos de los platos.
     Iconos.tsx        Los íconos, dibujados a mano en vez de usar emojis.
     MarcoAuth.tsx     El marco común de registro e ingreso.

   ──────────────────────────────────────────────────────────────────────

   Este archivo en particular: el botón principal.

   Es un detalle de interfaz, pero sirve para contar una decisión técnica. La
   primera versión dibujaba el reflejo con WebGL, y no se veía: cada botón
   necesitaba un recurso del que el navegador da pocos, y en una máquina sin
   aceleración gráfica quedaba plano sin avisar.

   Se rehízo con CSS. Ahora anda en cualquier máquina y se puede usar en todos los
   botones que haga falta. Y si el sistema del usuario pide menos animaciones, el
   reflejo queda quieto en lugar de desaparecer (accesibilidad).

   Responde a: RNF-01 y RNF-05 (compatibilidad entre navegadores).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { seguirPuntero } from '../lib/specular'

/**
 * Botón con reflejo especular: una luz recorre el borde siguiendo al cursor y
 * se enciende a medida que el puntero se acerca.
 *
 * Inspirado en el SpecularButton de React Bits (reactbits.dev, MIT + Commons
 * Clause). Acá el reflejo se dibuja con CSS —un conic-gradient enmascarado
 * sobre el borde— en lugar de WebGL, así anda en cualquier máquina y se puede
 * usar en todos los botones que haga falta.
 */

type Props = {
  children: ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  /** Relleno del botón. Por defecto, el vino de la marca. */
  fondo?: string
  /** Color de la luz que recorre el borde. */
  brillo?: string
  texto?: string
  radio?: number
}

export function BotonSpecular({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  fondo = 'var(--rb-vino)',
  brillo = '#FFD9E2',
  texto = 'var(--rb-sobre-vino)',
  radio = 12,
}: Props) {
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!boton.current) return
    return seguirPuntero(boton.current)
  }, [])

  return (
    <button
      ref={boton}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={
        {
          '--sp-fondo': fondo,
          '--sp-brillo': brillo,
          '--sp-texto': texto,
          '--sp-radio': `${radio}px`,
        } as CSSProperties
      }
      className={`boton-specular ${className}`}
    >
      <span className="relative z-[2] inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}
