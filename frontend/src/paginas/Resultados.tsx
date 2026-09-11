/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La pantalla de resultados: lista y mapa sincronizados.

   Los datos NO están en este archivo: se le piden a la API y se dibujan. Esa es
   la separación de capas en la práctica. Si mañana cambia cómo se calcula la
   distancia, esta pantalla no se entera.

   Lo que sí decide esta pantalla es cómo se muestra: los avisos de que se amplió
   el radio, el de que no hay ubicación compartida, y el resaltado del pin cuando
   el usuario pasa por una ficha.

   Responde a: RF-02 a RF-04 y RNF-01 (la misma pantalla se acomoda a celular y a
   computadora).
   ════════════════════════════════════════════════════════════════════ */

import {
  formatearDistancia,
  formatearPuntaje,
  ORDENES,
  simbolosPrecio,
  type Orden,
  type RespuestaBusqueda,
} from '@restoba/compartido'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { buscar } from '../lib/cliente'
import { Encabezado } from '../componentes/Encabezado'
import { Foto } from '../componentes/Foto'
import { Aviso, Lupa, Pin } from '../componentes/Iconos'
import { Mapa } from '../componentes/Mapa'

const NOMBRE_ORDEN: Record<Orden, string> = {
  cercania: 'Cercanía',
  puntaje: 'Puntaje',
  mixto: 'Mixto',
}

export function Resultados() {
  const [params, setParams] = useSearchParams()
  const [datos, setDatos] = useState<RespuestaBusqueda | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)

  const q = params.get('q') ?? undefined
  const cocina = params.get('cocina') ?? undefined
  const lat = params.get('lat') ? Number(params.get('lat')) : undefined
  const lng = params.get('lng') ? Number(params.get('lng')) : undefined
  const radio = params.get('radio') ? Number(params.get('radio')) : undefined
  const orden = (params.get('orden') as Orden | null) ?? 'cercania'
  const sel = params.get('sel')

  // El «Ubicar» de la portada llega como ?sel=<id>: se abre esa ficha al entrar.
  useEffect(() => {
    if (sel) setSeleccionado(Number(sel))
  }, [sel])

  useEffect(() => {
    const ctrl = new AbortController()
    setCargando(true)
    setError(null)

    buscar({ q, cocina, lat, lng, radio, orden }, ctrl.signal)
      .then(setDatos)
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setError(e instanceof Error ? e.message : 'error_desconocido')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })

    return () => ctrl.abort()
  }, [q, cocina, lat, lng, radio, orden])

  function cambiar(clave: string, valor: string | null) {
    const proximo = new URLSearchParams(params)
    if (valor === null) proximo.delete(clave)
    else proximo.set(clave, valor)
    proximo.delete('sel')
    setParams(proximo)
  }

  const resultados = datos?.resultados ?? []
  const ubicacion = lat !== undefined && lng !== undefined ? { lat, lng } : null
  const titulo = cocina
    ? `${cocina.charAt(0).toUpperCase()}${cocina.slice(1)}${ubicacion ? ' cerca tuyo' : ''}`
    : q
      ? `Resultados para «${q}»`
      : 'Todos los restaurantes'

  return (
    <div className="min-h-screen bg-papel">
      <Encabezado compacto>
        <span className="hidden items-center gap-2 rounded-full border border-regla-2 bg-papel px-4 py-2 md:flex">
          <Lupa tam={15} className="text-tinta-3" />
          <span className="text-sm text-tinta">{cocina ?? q ?? 'Todos'}</span>
          {ubicacion && (
            <>
              <span className="h-4 w-px bg-regla" />
              <Pin tam={14} className="text-verde" />
              <span className="text-sm font-semibold text-verde">Cerca mío</span>
            </>
          )}
        </span>
      </Encabezado>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-10">
        {/* Encabezado de la búsqueda */}
        <div className="panel mb-4 flex flex-wrap items-center gap-5 px-5 py-4">
          <div className="mr-auto">
            <h1 className="m-0 text-[27px]">{titulo}</h1>
            <p className="m-0 mt-1 font-mono text-[11.5px] tracking-wider text-tinta-3">
              {cargando
                ? 'BUSCANDO…'
                : [
                    `${datos?.total ?? 0} ${datos?.total === 1 ? 'RESULTADO' : 'RESULTADOS'}`,
                    datos?.radioAplicado ? `RADIO ${datos.radioAplicado / 1000} KM` : null,
                    `ORDEN: ${NOMBRE_ORDEN[datos?.ordenAplicado ?? orden].toUpperCase()}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="volanta hidden text-tinta-3 sm:inline">Ordenar por</span>
            <div className="flex gap-0.5 rounded-full bg-superficie-3 p-[3px]">
              {ORDENES.map((o) => {
                const activo = (datos?.ordenAplicado ?? orden) === o
                const inhabilitado = o === 'cercania' && !ubicacion
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={inhabilitado}
                    title={inhabilitado ? 'Necesitás compartir tu ubicación' : undefined}
                    onClick={() => cambiar('orden', o)}
                    className={`cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      activo
                        ? 'bg-superficie text-vino shadow-[0_1px_3px_rgba(27,28,33,.14)]'
                        : 'bg-transparent text-tinta-2'
                    }`}
                  >
                    {NOMBRE_ORDEN[o]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Avisos: radio ampliado y búsqueda sin GPS */}
        {datos?.radioAmpliado && (
          <Nota
            texto={
              <>
                Dentro de 1 km no encontramos nada, así que{' '}
                <strong className="font-semibold text-tinta">
                  ampliamos la búsqueda a {(datos.radioAplicado ?? 0) / 1000} km
                </strong>
                .
              </>
            }
            accion={
              <button
                type="button"
                onClick={() => cambiar('radio', '1000')}
                className="boton boton-fantasma boton-chico shrink-0 border-ambar text-ambar"
              >
                Volver a 1 km
              </button>
            }
          />
        )}

        {datos && !datos.conUbicacion && (
          <Nota
            texto={
              <>
                No estás compartiendo tu ubicación, así que ordenamos por puntaje en lugar de por
                distancia. Podés activarla desde la portada.
              </>
            }
          />
        )}

        {error && (
          <Nota
            texto={
              <>No pudimos completar la búsqueda ({error}). Revisá que la API esté levantada.</>
            }
          />
        )}

        {/* Lista + mapa */}
        <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div>
            <div className="mb-2.5 flex items-baseline gap-2.5 px-0.5">
              <b className="font-display text-[17px] font-semibold">Restaurantes en la zona</b>
              <span className="ml-auto font-mono text-[11px] text-tinta-3">
                {resultados.length} {resultados.length === 1 ? 'ficha' : 'fichas'}
              </span>
            </div>

            <ul className="m-0 grid max-h-[664px] list-none gap-3 overflow-y-auto p-0 pr-1">
              {cargando && resultados.length === 0 && (
                <li className="rounded-panel border border-regla bg-superficie px-5 py-8 text-center text-sm text-tinta-3">
                  Buscando…
                </li>
              )}

              {!cargando && resultados.length === 0 && !error && (
                <li className="rounded-panel border border-dashed border-regla-2 bg-superficie-2 px-5 py-10 text-center">
                  <p className="m-0 mb-1 font-display text-lg font-semibold">
                    No encontramos nada con eso
                  </p>
                  <p className="m-0 text-sm text-tinta-3">
                    Probá con otro tipo de comida, o ampliá el radio de búsqueda.
                  </p>
                </li>
              )}

              {resultados.map((r, i) => (
                <li key={r.id}>
                  <article
                    onMouseEnter={() => setSeleccionado(r.id)}
                    onClick={() => setSeleccionado(r.id)}
                    className={`cursor-pointer rounded-panel border bg-superficie p-3 transition ${
                      seleccionado === r.id
                        ? 'border-vino shadow-[0_8px_22px_-12px_color-mix(in_srgb,var(--rb-vino)_45%,transparent)]'
                        : 'border-regla hover:border-regla-2'
                    }`}
                  >
                    <Foto className="h-[208px] rounded-[10px]" tamIcono={34}>
                      <span className="absolute top-2.5 left-2.5 z-[2] rounded-lg bg-tinta/85 px-2.5 py-1 font-mono text-[11px] text-papel">
                        Nº {String(i + 1).padStart(2, '0')}
                      </span>
                    </Foto>

                    <div className="px-1 pt-3">
                      <p className="volanta m-0 mb-2 text-tinta-3">
                        {r.cocinas.map((c) => c.nombre).join(' · ')}
                      </p>

                      {r.abierto !== null && (
                        <span className={r.abierto ? 'chip chip-verde' : 'chip'}>
                          {r.abierto
                            ? r.cierraA
                              ? `ABIERTO · CIERRA ${r.cierraA}`
                              : 'ABIERTO'
                            : 'CERRADO AHORA'}
                        </span>
                      )}

                      <h2 className="mt-2 mb-1 text-xl leading-tight">
                        <Link
                          to={`/restaurante/${r.id}`}
                          className="text-tinta no-underline hover:text-vino"
                        >
                          {r.nombre}
                        </Link>
                      </h2>

                      <p className="m-0 mb-2.5 flex items-center gap-1.5 text-[12.5px] text-tinta-3">
                        <Pin tam={13} />
                        {[r.barrio, simbolosPrecio(r.rangoPrecio), formatearDistancia(r.distancia)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>

                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-display text-[22px] leading-none font-semibold text-vino">
                          {formatearPuntaje(r.calificacion) ?? 'Sin reseñas'}
                        </span>
                        {r.resenas > 0 && (
                          <span className="text-[12.5px] text-tinta-3">{r.resenas} reseñas</span>
                        )}
                        {r.distancia !== null && (
                          <span className="ml-auto font-mono text-[13.5px] text-tinta">
                            {formatearDistancia(r.distancia)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-[500px] overflow-hidden rounded-panel border border-regla-2 lg:h-[664px]">
            <Mapa
              resultados={resultados}
              ubicacion={ubicacion}
              seleccionado={seleccionado}
              onSeleccionar={setSeleccionado}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Nota({ texto, accion }: { texto: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3.5 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-4.5 py-3.5">
      <Aviso tam={18} className="shrink-0 text-ambar" />
      <p className="m-0 grow text-[13.5px] leading-snug text-tinta-2">{texto}</p>
      {accion}
    </div>
  )
}
