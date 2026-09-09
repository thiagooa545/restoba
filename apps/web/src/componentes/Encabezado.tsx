import { Link } from 'react-router'
import { useSesion } from '../lib/Sesion'

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
          <Sesion />
        </div>
      </div>
    </div>
  )
}

/** Estado de la sesión en la barra: visitante, registrado o verificado. */
function Sesion() {
  const { comensal, cargando } = useSesion()

  if (cargando) return null

  if (!comensal) {
    return (
      <>
        <Link to="/ingresar" className="boton boton-fantasma boton-chico border-transparent no-underline">
          Ingresar
        </Link>
        <Link to="/registro" className="boton boton-vino boton-chico no-underline">
          Crear cuenta
        </Link>
      </>
    )
  }

  const verificado = comensal.legal.verificado

  return (
    <Link
      to="/cuenta"
      className="flex items-center gap-2.5 rounded-full border border-regla-2 bg-superficie py-1.5 pr-3.5 pl-1.5 no-underline transition-colors hover:border-vino"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-semibold ${
          verificado ? 'bg-verde text-papel' : 'bg-superficie-3 text-tinta-2'
        }`}
      >
        {comensal.nombre.trim().charAt(0).toUpperCase()}
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-[13px] font-semibold text-tinta">
          {comensal.nombre.split(' ')[0]}
        </span>
        <span
          className={`block font-mono text-[10px] tracking-wider ${verificado ? 'text-verde' : 'text-tinta-3'}`}
        >
          {verificado ? 'VERIFICADA' : 'SIN VERIFICAR'}
        </span>
      </span>
    </Link>
  )
}
