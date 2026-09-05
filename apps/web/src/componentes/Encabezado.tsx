import { Link } from 'react-router'

/**
 * Barra superior flotante: se apoya sobre el contenido en lugar de empujarlo.
 * `compacto` la usa el resto de las pantallas, donde no hay banda de portada.
 */
export function Encabezado({
  compacto = false,
  children,
}: {
  compacto?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={
        compacto
          ? 'sticky top-0 z-[1000] border-b border-regla bg-papel/90 backdrop-blur'
          : 'absolute inset-x-4 top-4 z-[1000] sm:inset-x-10'
      }
    >
      <div
        className={
          compacto
            ? 'mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3 sm:px-8'
            : 'flex flex-wrap items-center gap-4 rounded-flotante border border-regla bg-superficie/95 px-4 py-3 shadow-flotante backdrop-blur sm:px-6'
        }
      >
        <Link
          to="/"
          className="font-display text-[22px] font-semibold tracking-tight text-tinta no-underline"
        >
          RestoBA
        </Link>
        <span className="volanta hidden text-tinta-3 sm:inline">Buenos Aires</span>

        {children}

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="boton boton-fantasma boton-chico border-transparent">
            Ingresar
          </button>
          <button type="button" className="boton boton-vino boton-chico">
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  )
}
