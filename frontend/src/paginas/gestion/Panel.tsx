/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El marco del panel: lo que se ve alrededor de cada pantalla de gestión.

   Hace tres cosas que conviene contar:

   1. El candado. Si no hay sesión de personal, muestra el login y no la
      pantalla pedida. Es un control de comodidad, no de seguridad: la
      seguridad real está en el backend, que rechaza la llamada aunque
      alguien escriba la dirección a mano. Nunca se confía en el
      navegador para decidir quién puede ver qué.

   2. Las pestañas dependen del rol. Un mozo no ve «Depósito» porque no
      maneja el depósito. Sale de PERMISOS_ROL, que está en la carpeta
      compartida y es la misma tabla que usa el backend para decidir:
      una sola fuente para las dos capas.

   3. El aviso de suscripción. Si el local no tiene la transferencia
      acreditada, el panel queda en modo lectura y se explica por qué.
      No se lo echa: puede mirar todo, pero no cargar. Es el modelo de
      negocio del documento (apartado 1.1) y el art. 10 de los T&C.

   Responde a: RF-08, RF-12 y T&C art. 10.
   ════════════════════════════════════════════════════════════════════ */

import { NOMBRE_ROL, NOMBRE_SUSCRIPCION, rolPuede, type EstadoSuscripcion } from '@restoba/compartido'
import { Link, NavLink, Outlet } from 'react-router'
import { ProveedorGestion, useGestion } from '../../lib/SesionGestion'
import { IngresarGestion } from './Ingresar'

/**
 * Por qué el panel quedó en modo lectura, en los términos del art. 10 de los
 * T&C: el pago es por transferencia y la acreditación es manual, así que un
 * local puede estar esperando que la plataforma confirme el depósito.
 */
const MOTIVO_LECTURA: Record<EstadoSuscripcion, string> = {
  activa: '',
  pendiente_acreditacion: 'La transferencia del período todavía no está acreditada.',
  vencida: 'El período de la suscripción venció y no se registró la renovación.',
  cancelada: 'La suscripción está cancelada.',
}

/** Las pestañas del panel, con el permiso que hace falta para verlas. */
const SECCIONES = [
  { a: '/gestion/inventario', texto: 'Depósito', permiso: 'stock' },
  { a: '/gestion/recetas', texto: 'Recetas', permiso: 'stock' },
] as const

function Barra() {
  const { usuario, cerrar } = useGestion()
  if (!usuario) return null

  const alDia = usuario.suscripcion === 'activa'

  return (
    <header className="sticky top-0 z-20 border-b border-regla bg-superficie/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link
          to="/gestion/inventario"
          className="font-display text-[19px] font-semibold tracking-tight text-tinta no-underline"
        >
          RestoBA
          <span className="ml-2 align-middle font-sans text-[10.5px] font-bold tracking-[0.17em] text-vino uppercase">
            Gestión
          </span>
        </Link>

        <span className="hidden h-5 w-px bg-regla-2 sm:block" />

        {/* En pantalla chica el nombre del local baja a su propia línea: si se
            queda en la fila se recorta a dos letras y deja de decir nada. */}
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <p className="truncate text-[14px] leading-tight font-medium text-tinta">
            {usuario.restaurante}
          </p>
          <p className="truncate font-mono text-[11.5px] leading-tight text-tinta-3">
            {usuario.email} · {NOMBRE_ROL[usuario.rol]}
          </p>
        </div>

        <span className={alDia ? 'chip chip-verde' : 'chip chip-ambar'}>
          {NOMBRE_SUSCRIPCION[usuario.suscripcion]}
        </span>

        <button type="button" onClick={() => void cerrar()} className="boton boton-fantasma boton-chico">
          Salir
        </button>
      </div>

      <nav className="mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-4">
        {SECCIONES.filter((s) => rolPuede(usuario.rol, s.permiso)).map((s) => (
          <NavLink
            key={s.a}
            to={s.a}
            className={({ isActive }) =>
              [
                'border-b-2 px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap no-underline transition-colors',
                isActive
                  ? 'border-vino text-vino'
                  : 'border-transparent text-tinta-2 hover:border-regla-2 hover:text-tinta',
              ].join(' ')
            }
          >
            {s.texto}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

function Contenido() {
  const { usuario, cargando } = useGestion()

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-[13px] text-tinta-3">Recuperando la sesión…</p>
      </div>
    )
  }

  if (!usuario) return <IngresarGestion />

  return (
    <div className="min-h-screen bg-superficie-2">
      <Barra />

      {usuario.suscripcion !== 'activa' && (
        <div className="border-b border-ambar/30 bg-ambar-suave">
          <p className="mx-auto max-w-[1180px] px-4 py-2.5 text-[13px] leading-snug text-ambar">
            <strong className="font-semibold">Panel en modo lectura.</strong> {MOTIVO_LECTURA[usuario.suscripcion]}{' '}
            El local no aparece en el buscador y no se pueden registrar cambios, pero podés ver todo
            lo que ya está cargado.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-[1180px] px-4 py-7">
        {/* Un mozo o la cocina no tienen todavía ninguna pantalla acá: las suyas
            son las de pedidos, que son la etapa siguiente. Se lo decimos en vez
            de mostrarles un panel que la API les va a rechazar. */}
        {SECCIONES.some((s) => rolPuede(usuario.rol, s.permiso)) ? (
          <Outlet />
        ) : (
          <div className="panel mx-auto max-w-[520px] px-6 py-8 text-center">
            <p className="volanta mb-2 text-tinta-3">{NOMBRE_ROL[usuario.rol]}</p>
            <h1 className="mb-3 text-[24px] leading-tight">Todavía no hay nada acá para vos</h1>
            <p className="text-[14px] leading-relaxed text-tinta-2">
              Las pantallas de tu rol son las del salón y la cocina, que llegan en la próxima etapa.
              El depósito lo maneja la administración del local.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

/** Envuelve todas las rutas de /gestion: provee la sesión y pone el candado. */
export function MarcoGestion() {
  return (
    <ProveedorGestion>
      <Contenido />
    </ProveedorGestion>
  )
}
