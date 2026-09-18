import {
  DIAS,
  formatearDistancia,
  formatearPrecio,
  formatearPuntaje,
  simbolosPrecio,
  type RestauranteDetalle,
} from '@restoba/compartido'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import * as api from '../lib/cliente'
import { verRestaurante } from '../lib/cliente'
import { useSesion } from '../lib/Sesion'
import { Encabezado } from '../componentes/Encabezado'
import { Foto } from '../componentes/Foto'
import { Aviso, Hoja, Pin, Reloj, Telefono, Volver } from '../componentes/Iconos'
import { BotonSpecular } from '../componentes/BotonSpecular'
import { Resenas } from '../componentes/Resenas'
import { Reservar } from '../componentes/Reservar'

export function Perfil() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { comensal } = useSesion()
  const [resto, setResto] = useState<RestauranteDetalle | null>(null)
  const [favorito, setFavorito] = useState(false)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no_existe' | 'error'>('cargando')

  const lat = params.get('lat') ? Number(params.get('lat')) : undefined
  const lng = params.get('lng') ? Number(params.get('lng')) : undefined

  useEffect(() => {
    const ctrl = new AbortController()
    const numero = Number(id)

    if (!Number.isInteger(numero) || numero <= 0) {
      setEstado('no_existe')
      return
    }

    verRestaurante(
      numero,
      lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
      ctrl.signal,
    )
      .then((r) => {
        setResto(r)
        setFavorito(r.favorito)
        setEstado('listo')
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setEstado(e instanceof Error && e.message === 'restaurante_no_encontrado' ? 'no_existe' : 'error')
      })

    return () => ctrl.abort()
  }, [id, lat, lng])

  if (estado === 'cargando') {
    return <Marco><p className="py-24 text-center text-tinta-3">Cargando…</p></Marco>
  }

  if (estado !== 'listo' || !resto) {
    return (
      <Marco>
        <div className="panel mx-auto my-24 max-w-lg px-8 py-10 text-center">
          <h1 className="mb-2 text-2xl">
            {estado === 'no_existe' ? 'No encontramos ese restaurante' : 'Algo salió mal'}
          </h1>
          <p className="mb-6 text-sm text-tinta-2">
            {estado === 'no_existe'
              ? 'Puede que haya dado de baja su suscripción o que el enlace esté mal.'
              : 'No pudimos traer los datos. Revisá que la API esté levantada.'}
          </p>
          <Link to="/" className="boton boton-vino no-underline">
            Volver al buscador
          </Link>
        </div>
      </Marco>
    )
  }

  // Un plato agotado no puede ser el que encabeza el perfil: sería invitar al
  // comensal con algo que hoy no se puede pedir.
  const destacados = resto.carta.flatMap((c) =>
    c.productos.filter((p) => p.destacado && p.activo && !p.sinStock),
  )
  const platoEstrella = destacados[0] ?? null

  return (
    <Marco>
      {/* Banda de fotos */}
      <div className="grid gap-px border-b border-regla bg-regla sm:grid-cols-[2fr_1fr_1fr]">
        <Foto className="h-[240px] sm:h-[330px]" tamIcono={42} />
        <Foto className="hidden h-[330px] sm:flex" tamIcono={32} />
        <Foto className="hidden h-[330px] sm:flex" tamIcono={32}>
          <button type="button" className="boton boton-fantasma boton-chico absolute right-4 bottom-4 z-[2]">
            Ver las fotos
          </button>
        </Foto>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_1px_400px]">
        {/* Columna principal */}
        <div>
          <p className="volanta mb-3 text-vino">
            {[resto.barrio, resto.ciudad].filter(Boolean).join(' · ')}
          </p>
          <h1 className="mb-3.5 text-[clamp(2rem,5vw,3rem)] leading-[1.05] tracking-[-0.028em]">
            {resto.nombre}
          </h1>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {resto.cocinas.map((c) => (
              <span key={c.slug} className="chip">
                {c.nombre.toUpperCase()}
              </span>
            ))}
            {resto.abierto !== null && (
              <span className={resto.abierto ? 'chip chip-verde' : 'chip'}>
                {resto.abierto
                  ? resto.cierraA
                    ? `ABIERTO · CIERRA ${resto.cierraA}`
                    : 'ABIERTO'
                  : 'CERRADO AHORA'}
              </span>
            )}
          </div>

          <dl className="mb-7 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-regla bg-regla sm:grid-cols-4">
            <Dato titulo="Puntaje" valor={formatearPuntaje(resto.calificacion) ?? '—'} acento />
            <Dato titulo="Reseñas" valor={String(resto.resenas)} />
            <Dato titulo="Distancia" valor={formatearDistancia(resto.distancia) ?? '—'} />
            <Dato titulo="Precio" valor={simbolosPrecio(resto.rangoPrecio)} />
          </dl>

          {resto.descripcion && (
            <p className="mb-7 max-w-2xl font-display text-lg leading-relaxed text-tinta-2">
              {resto.descripcion}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 border-b border-regla pb-8">
            <a href="#reservar" className="no-underline">
              <BotonSpecular>Reservar mesa</BotonSpecular>
            </a>
            <Link to={`/restaurante/${resto.id}/carta`} className="no-underline">
              <BotonSpecular fondo="#1B1C21" brillo="#FCFBF9">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 8h8" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
                Ver la carta
              </BotonSpecular>
            </Link>
            <Link
              to={`/buscar?sel=${resto.id}${lat !== undefined ? `&lat=${lat}&lng=${lng}` : ''}`}
              className="boton boton-fantasma no-underline"
            >
              <Pin tam={16} />
              Ubicar
            </Link>
            <button
              type="button"
              className={`boton boton-fantasma ${favorito ? 'border-vino text-vino' : ''}`}
              disabled={!comensal}
              title={comensal ? undefined : 'Ingresá para guardar restaurantes'}
              onClick={() => {
                void api
                  .alternarFavorito(resto.id)
                  .then((r) => setFavorito(r.favorito))
                  .catch(() => undefined)
              }}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill={favorito ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.7}
                strokeLinecap="round" strokeLinejoin="round" aria-hidden
              >
                <path d="M6 4h12v17l-6-4-6 4V4Z" />
              </svg>
              {favorito ? 'Guardado' : 'Guardar'}
            </button>
          </div>

          {/* Plato destacado */}
          {platoEstrella && (
            <div className="panel mt-9 grid overflow-hidden sm:grid-cols-[300px_minmax(0,1fr)]">
              <Foto className="h-[200px] sm:h-full" tamIcono={40} />
              <div className="flex flex-col justify-center px-6 py-7">
                <span className="chip chip-vino mb-3 self-start">EL MÁS PEDIDO</span>
                <h3 className="mb-2 text-2xl leading-tight">{platoEstrella.nombre}</h3>
                {platoEstrella.descripcion && (
                  <p className="mb-4 text-[15px] leading-relaxed text-tinta-2">
                    {platoEstrella.descripcion}
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="volanta text-tinta-3">Precio</span>
                  <span className="grow border-b border-dotted border-regla-2" />
                  <span className="font-mono text-2xl text-tinta">
                    {formatearPrecio(platoEstrella.precio)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* La carta */}
          <div className="mt-10 mb-6 flex flex-wrap items-end gap-5">
            <div className="mr-auto">
              <h2 className="m-0 mb-1 text-[28px]">La carta</h2>
              <p className="m-0 font-mono text-[11.5px] tracking-wider text-tinta-3">
                {resto.carta.reduce((n, c) => n + c.productos.length, 0)} PLATOS · PRECIOS EN PESOS
              </p>
            </div>
            <Link to={`/restaurante/${resto.id}/carta`} className="boton boton-fantasma no-underline">
              Verla con fotos
            </Link>
          </div>

          {resto.carta.length === 0 ? (
            <p className="rounded-panel border border-dashed border-regla-2 bg-superficie-2 px-6 py-8 text-center text-sm text-tinta-3">
              Este local todavía no cargó su carta.
            </p>
          ) : (
            <div className="max-w-2xl">
              {resto.carta.map((categoria) => (
                <section key={categoria.id} className="mb-9 last:mb-0">
                  <div className="mb-4 flex items-baseline gap-3.5 border-b-2 border-tinta pb-2.5">
                    <h3 className="volanta m-0 text-ambar">{categoria.nombre}</h3>
                    <span className="font-mono text-[11px] text-tinta-3">
                      {categoria.productos.length}{' '}
                      {categoria.productos.length === 1 ? 'plato' : 'platos'}
                    </span>
                  </div>

                  {categoria.productos.map((p) => (
                    <article
                      key={p.id}
                      className={`border-b border-regla py-3 last:border-b-0 ${p.activo && !p.sinStock ? '' : 'opacity-50'}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-[17px] font-semibold">{p.nombre}</span>
                        <span className="grow -translate-y-[3px] border-b border-dotted border-regla-2" />
                        <span className="font-mono text-[15px]">{formatearPrecio(p.precio)}</span>
                      </div>

                      {p.descripcion && (
                        <p className="m-0 mt-1 text-[13.5px] leading-snug text-tinta-3">
                          {p.descripcion}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {!p.activo && <span className="chip">HOY NO HAY</span>}
                        {p.activo && p.sinStock && (
                          <span className="chip chip-ambar">SIN STOCK HOY</span>
                        )}
                        {p.vegetariano && (
                          <span className="chip chip-verde">
                            <Hoja tam={11} />
                            VEGETARIANO
                          </span>
                        )}
                        {p.sinTacc && <span className="chip">SIN TACC</span>}
                      </div>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}

          <Resenas restauranteId={resto.id} nombre={resto.nombre} />
        </div>

        <div className="hidden self-stretch bg-regla lg:block" />

        {/* Columna lateral */}
        <aside id="reservar" className="flex flex-col gap-6 scroll-mt-24">
          <Reservar restauranteId={resto.id} nombre={resto.nombre} />

          <div>
            <p className="volanta mb-2.5 text-tinta-3">
              <Reloj tam={13} className="mr-1.5 inline align-[-2px]" />
              Horarios
            </p>
            <div className="overflow-hidden rounded-panel border border-regla">
              {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                const delDia = resto.horarios.find((h) => h.dia === dia)
                return (
                  <div
                    key={dia}
                    className="flex justify-between gap-3 border-b border-regla bg-superficie px-3.5 py-2.5 last:border-b-0"
                  >
                    <span className="text-sm text-tinta-2">{DIAS[dia]}</span>
                    <span className="font-mono text-[13px] text-tinta">
                      {delDia
                        ? delDia.turnos.map((t) => `${t.abre}–${t.cierra}`).join(' · ')
                        : 'Cerrado'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="volanta mb-2.5 text-tinta-3">Cómo llegar</p>
            <p className="m-0 mb-1 text-sm leading-snug text-tinta">{resto.direccion}</p>
            <p className="m-0 text-[13px] leading-snug text-tinta-3">
              {[resto.barrio, formatearDistancia(resto.distancia) && `a ${formatearDistancia(resto.distancia)}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {resto.telefono && (
              <p className="m-0 mt-2 flex items-center gap-2 font-mono text-[13px] text-tinta-2">
                <Telefono tam={14} />
                {resto.telefono}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-r-panel border-l-[3px] border-vino bg-vino-suave px-4.5 py-4">
            <Aviso tam={18} className="mt-0.5 shrink-0 text-vino" />
            <p className="m-0 text-[13.5px] leading-relaxed text-tinta-2">
              {resto.resenas > 0 ? (
                <>
                  <strong className="font-semibold text-tinta">
                    Las {resto.resenas} reseñas son de visitas reales.
                  </strong>{' '}
                  Solo puede puntuar quien tenga una reserva o un pedido registrado en este local.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-tinta">Todavía no tiene reseñas.</strong> Es
                  un local recién incorporado a la plataforma.
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-papel">
      <Encabezado compacto>
        <Link
          to="/buscar"
          className="hidden items-center gap-2 text-[13.5px] font-semibold text-tinta-2 no-underline hover:text-tinta sm:flex"
        >
          <Volver tam={15} />
          Volver a los resultados
        </Link>
      </Encabezado>
      {children}
    </div>
  )
}

function Dato({ titulo, valor, acento = false }: { titulo: string; valor: string; acento?: boolean }) {
  return (
    <div className="bg-superficie px-4 py-3.5">
      <dt className="volanta mb-1.5 text-tinta-3">{titulo}</dt>
      <dd
        className={`m-0 font-display text-2xl leading-none font-semibold ${acento ? 'text-vino' : 'text-tinta'}`}
      >
        {valor}
      </dd>
    </div>
  )
}
