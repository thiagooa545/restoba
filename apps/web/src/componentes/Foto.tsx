import { Cubiertos } from './Iconos'

/**
 * Marcador de foto. Los locales todavía no cargan imágenes propias, así que en
 * vez de inventar una se muestra una textura con el ícono de cubiertos: se lee
 * como «acá va una foto» y no como una foto real.
 */
export function Foto({
  className = '',
  tamIcono = 30,
  children,
}: {
  className?: string
  tamIcono?: number
  children?: React.ReactNode
}) {
  return (
    <div className={`foto ${className}`}>
      <Cubiertos tam={tamIcono} className="relative z-[1] opacity-70" />
      {children}
    </div>
  )
}
