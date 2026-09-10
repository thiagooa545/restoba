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
