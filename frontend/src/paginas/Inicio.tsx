import {
  formatearDistancia,
  formatearPuntaje,
  simbolosPrecio,
  type RestauranteResultado,
} from '@restoba/compartido'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { buscar, tiposDeCocina, type TipoCocina } from '../lib/cliente'
import { Encabezado } from '../componentes/Encabezado'
import { Foto } from '../componentes/Foto'
import { Aviso, Estrella, Lupa, Pin } from '../componentes/Iconos'
import { useUbicacion } from '../lib/useUbicacion'

export function Inicio() {
  const navegar = useNavigate()
  const { ubicacion, pedir } = useUbicacion()
  const [texto, setTexto] = useState('')
  const [cocinas, setCocinas] = useState<TipoCocina[]>([])
  const [ranking, setRanking] = useState<RestauranteResultado[]>([])

  useEffect(() => {
    const ctrl = new AbortController()
    void tiposDeCocina(ctrl.signal).then(setCocinas).catch(() => undefined)
    void buscar({ orden: 'puntaje' }, ctrl.signal)
      .then((r) => setRanking(r.resultados.slice(0, 5)))
      .catch(() => undefined)
    return () => ctrl.abort()
  }, [])

  const coords = ubicacion.estado === 'lista' ? ubicacion.coords : null

  function irABuscar(extra: Record<string, string> = {}) {
    const params = new URLSearchParams(extra)
    if (texto.trim() && !extra['cocina']) params.set('q', texto.trim())
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
    }
    navegar(`/buscar?${params.toString()}`)
  }

  const [destacado, ...resto] = ranking

  return (
    <div className="min-h-screen bg-papel">
      {/* ── Banda de portada ─────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-regla bg-superficie-2">
        {/* Textura de puntos: da cuerpo al fondo sin recurrir a un degradé. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage: 'radial-gradient(var(--rb-regla-2) 1.1px, transparent 1.1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-28 hidden h-[460px] w-[460px] rounded-full bg-superficie-3 opacity-80 lg:block" />

        <Encabezado />

        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 pt-28 pb-14 sm:px-10 lg:grid-cols-[1.06fr_0.94fr] lg:pt-32">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-[3px] w-8 rounded-sm bg-vino" />
              <span className="volanta text-vino">Guía gastronómica · Área metropolitana</span>
            </div>

            <h1 className="mb-5 text-[clamp(2.4rem,6vw,3.9rem)] leading-[1.02] tracking-[-0.03em]">
              ¿Qué tenés
              <br />
              ganas de comer?
            </h1>

            <p className="mb-8 max-w-lg font-display text-lg leading-relaxed text-tinta-2 sm:text-xl">
              Buscá por tipo de comida y te mostramos lo que hay cerca tuyo, ordenado por distancia
              real y por lo que dijeron otros comensales.
            </p>

            {/* Módulo de búsqueda */}
            <form
              className="panel max-w-[620px] overflow-hidden rounded-flotante shadow-flotante"
              onSubmit={(e) => {
                e.preventDefault()
                irABuscar()
              }}
            >
              <div className="grid sm:grid-cols-[minmax(0,1fr)_1px_auto]">
                <label className="block px-5 py-4">
                  <span className="volanta mb-1.5 block text-tinta-3">Tipo de comida</span>
                  <span className="flex items-center gap-2.5">
                    <Lupa tam={18} className="shrink-0 text-tinta-3" />
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Pastas, parrilla, sushi…"
                      className="w-full bg-transparent text-base text-tinta outline-none placeholder:text-tinta-3"
                    />
                  </span>
                </label>

                <div className="hidden bg-regla sm:block" />

                <button
                  type="button"
                  onClick={pedir}
                  className="flex flex-col items-start gap-1.5 border-t border-regla px-5 py-4 text-left sm:border-t-0"
                >
                  <span className="volanta text-tinta-3">Dónde</span>
                  <span className="flex items-center gap-2">
                    <Pin
                      tam={16}
                      className={coords ? 'text-verde' : 'text-tinta-3'}
                    />
                    <span
                      className={`text-sm font-semibold ${coords ? 'text-verde' : 'text-tinta-2'}`}
                    >
                      {ubicacion.estado === 'pidiendo'
                        ? 'Buscando…'
                        : coords
                          ? 'Cerca mío'
                          : 'Usar mi ubicación'}
                    </span>
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-regla bg-superficie-2 px-5 py-3.5">
                <button type="submit" className="boton boton-vino">
                  Buscar
                </button>
                <span className="max-w-xs text-[12.5px] leading-snug text-tinta-3">
                  {ubicacion.estado === 'denegada'
                    ? 'No nos diste permiso para geolocalizar: vamos a ordenar por puntaje en lugar de por distancia.'
                    : 'Usamos tu ubicación solo mientras buscás. Podés escribir un barrio si preferís no compartirla.'}
                </span>
              </div>
            </form>

            {cocinas.length > 0 && (
              <>
                <p className="volanta mt-9 mb-3 text-tinta-3">O empezá por acá</p>
                <div className="flex max-w-[620px] flex-wrap gap-2">
                  {cocinas.slice(0, 9).map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      className="pastilla"
                      onClick={() => irABuscar({ cocina: c.slug })}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── El número uno ──────────────────────────────── */}
          {destacado && (
            <div>
              <article className="panel overflow-hidden">
                <Foto className="h-[232px]" tamIcono={46}>
                  <span className="absolute top-3.5 left-3.5 z-[2] flex items-center gap-1.5 rounded-full bg-ambar py-1.5 pr-3 pl-2.5 shadow-[0_4px_12px_-4px_rgba(129,82,20,.6)]">
                    <Estrella tam={13} className="text-papel" />
                    <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-papel">
                      TOP 01 DE LA SEMANA
                    </span>
                  </span>
                </Foto>

                <div className="px-5 pt-5 pb-5.5">
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {destacado.cocinas.map((c) => (
                      <span key={c.slug} className="chip">
                        {c.nombre.toUpperCase()}
                      </span>
                    ))}
                    {destacado.abierto !== null && (
                      <span className={destacado.abierto ? 'chip chip-verde' : 'chip'}>
                        {destacado.abierto ? 'ABIERTO' : 'CERRADO'}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-1.5 text-[27px] leading-tight">{destacado.nombre}</h2>
                  {destacado.descripcion && (
                    <p className="mb-4 line-clamp-2 text-sm leading-snug text-tinta-2">
                      {destacado.descripcion}
                    </p>
                  )}

                  <dl className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-regla bg-regla">
                    <Dato titulo="Puntaje" valor={formatearPuntaje(destacado.calificacion) ?? '—'} acento />
                    <Dato titulo="Distancia" valor={formatearDistancia(destacado.distancia) ?? '—'} />
                    <Dato titulo="Precio" valor={simbolosPrecio(destacado.rangoPrecio)} />
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/restaurante/${destacado.id}`}
                      className="boton boton-vino grow no-underline"
                    >
                      Ver perfil
                    </Link>
                    <button
                      type="button"
                      className="boton boton-fantasma"
                      onClick={() => irABuscar({ sel: String(destacado.id) })}
                    >
                      <Pin tam={16} />
                      Ubicar
                    </button>
                  </div>
                </div>
              </article>

              <p className="mt-3.5 text-center text-[12.5px] text-tinta-3">
                Ubicar te lleva al mapa centrado en el local.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── El resto del ranking ───────────────────────────── */}
      {resto.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pt-12 sm:px-10">
          <div className="mb-5 flex flex-wrap items-baseline gap-3.5 border-b-2 border-tinta pb-3">
            <h2 className="mr-auto text-[26px]">Mejor puntuados esta semana</h2>
            <span className="font-mono text-[11px] tracking-wider text-tinta-3">
              {coords ? 'CERCA TUYO' : 'EN LA CIUDAD'} · ACTUALIZADO HOY
            </span>
          </div>

          <ul className="grid list-none gap-3 p-0 lg:grid-cols-2">
            {resto.map((r, i) => (
              <li key={r.id}>
                <article className="group flex items-center gap-4 rounded-[12px] border border-regla bg-superficie p-3.5 transition hover:-translate-y-0.5 hover:border-vino">
                  <Foto className="h-[78px] w-[78px] shrink-0 rounded-[10px] border border-regla" tamIcono={24} />

                  <div className="min-w-0 grow">
                    <div className="mb-0.5 flex items-baseline gap-2.5">
                      <span className="font-mono text-xs text-ambar">
                        {String(i + 2).padStart(2, '0')}
                      </span>
                      <Link
                        to={`/restaurante/${r.id}`}
                        className="truncate font-display text-[19px] font-semibold text-tinta no-underline group-hover:text-vino"
                      >
                        {r.nombre}
                      </Link>
                    </div>
                    <p className="mb-1.5 truncate text-[12.5px] text-tinta-3">
                      {r.cocinas.map((c) => c.nombre).join(' · ')}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-mono text-[15px] font-medium text-vino">
                        {formatearPuntaje(r.calificacion) ?? 'sin reseñas'}
                      </span>
                      {r.distancia !== null && (
                        <span className="font-mono text-[12.5px] text-tinta-2">
                          {formatearDistancia(r.distancia)}
                        </span>
                      )}
                      {r.resenas > 0 && (
                        <span className="font-mono text-[12.5px] text-tinta-3">
                          {r.resenas} reseñas
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Ubicar en el mapa"
                    aria-label={`Ubicar ${r.nombre} en el mapa`}
                    onClick={() => irABuscar({ sel: String(r.id) })}
                    className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-regla-2 bg-superficie text-tinta-2 transition hover:border-verde hover:bg-verde-suave hover:text-verde"
                  >
                    <Pin tam={17} />
                  </button>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-3.5 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-4.5 py-4">
            <Aviso tam={18} className="shrink-0 text-ambar" />
            <p className="m-0 text-[13.5px] leading-snug text-tinta-2">
              <strong className="font-semibold text-tinta">
                Cada puntaje viene de una visita real.
              </strong>{' '}
              Solo puede reseñar quien tenga una reserva o un pedido registrado en el local.
            </p>
          </div>
        </section>
      )}

      {/* ── Cómo funciona ──────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-4 pt-11 pb-4 sm:px-10">
        <div className="panel overflow-hidden rounded-flotante">
          <div className="flex flex-wrap items-baseline gap-3 border-b border-regla bg-superficie-2 px-6 py-4">
            <span className="volanta text-vino">Cómo funciona</span>
            <span className="text-[13.5px] text-tinta-3">Buscar es gratis. Siempre.</span>
          </div>

          <div className="grid gap-px bg-regla sm:grid-cols-3">
            <Paso
              numero="01"
              titulo="Decinos qué se te antoja"
              texto="Escribís el tipo de comida. Si nos dejás usar el GPS, filtramos por lo que tenés a mano; si no, elegís el barrio."
              fondo="bg-vino-suave"
              color="text-vino"
              icono={<Lupa tam={19} />}
            />
            <Paso
              numero="02"
              titulo="Comparás en el mapa"
              texto="Ves distancia, puntaje y rango de precio en la misma pantalla. Ordenás por cercanía o por reseñas cuando quieras."
              fondo="bg-verde-suave"
              color="text-verde"
              icono={<Pin tam={19} />}
            />
            <Paso
              numero="03"
              titulo="Reservás y contás cómo te fue"
              texto="Reservás mesa desde el perfil. Después de la visita dejás tu reseña y sumás puntos para canjear."
              fondo="bg-ambar-suave"
              color="text-ambar"
              icono={<Estrella tam={19} />}
            />
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-8 flex max-w-[1400px] flex-wrap items-baseline gap-6 border-t border-regla px-4 py-8 sm:px-10">
        <b className="font-display text-lg font-semibold">RestoBA</b>
        <span className="mr-auto text-[13px] text-tinta-3">
          Buscar restaurantes es gratis. Los locales adheridos pagan la suscripción por
          transferencia bancaria.
        </span>
        <a href="#" className="text-[13px]">
          Términos y Condiciones
        </a>
        <a href="#" className="text-[13px]">
          Política de Privacidad
        </a>
        <a href="#" className="text-[13px]">
          Acuerdo de Verificación
        </a>
        <span className="chip">v1.0</span>
      </footer>
    </div>
  )
}

function Paso({
  numero,
  titulo,
  texto,
  icono,
  fondo,
  color,
}: {
  numero: string
  titulo: string
  texto: string
  icono: React.ReactNode
  fondo: string
  color: string
}) {
  return (
    <div className="bg-superficie px-7 py-7">
      <div
        className={`mb-3.5 flex h-10 w-10 items-center justify-center rounded-[12px] ${fondo} ${color}`}
      >
        {icono}
      </div>
      <span className="font-mono text-[11.5px] tracking-[0.07em] text-ambar">PASO {numero}</span>
      <h3 className="mt-1.5 mb-2 text-xl">{titulo}</h3>
      <p className="m-0 text-sm leading-relaxed text-tinta-2">{texto}</p>
    </div>
  )
}

function Dato({ titulo, valor, acento = false }: { titulo: string; valor: string; acento?: boolean }) {
  return (
    <div className="bg-papel px-3 py-2.5">
      <dt className="volanta mb-1 text-tinta-3">{titulo}</dt>
      <dd
        className={`m-0 font-display text-xl leading-none font-semibold ${acento ? 'text-vino' : 'text-tinta'}`}
      >
        {valor}
      </dd>
    </div>
  )
}
