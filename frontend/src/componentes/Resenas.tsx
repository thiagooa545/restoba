import {
  fechaLarga,
  formatearFecha,
  PUNTOS_POR_RESENA,
  type Resena,
  type ResumenResenas,
  type VisitaSinResenar,
} from '@restoba/compartido'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import * as api from '../lib/cliente'
import { ErrorApi } from '../lib/cliente'
import { useSesion } from '../lib/Sesion'
import { BotonSpecular } from './BotonSpecular'
import { Aviso, Estrella } from './Iconos'

export function Resenas({ restauranteId }: { restauranteId: number; nombre: string }) {
  const { comensal } = useSesion()
  const [resenas, setResenas] = useState<Resena[]>([])
  const [resumen, setResumen] = useState<ResumenResenas | null>(null)
  const [pendientes, setPendientes] = useState<VisitaSinResenar[]>([])
  const [cargando, setCargando] = useState(true)

  const traer = useCallback(
    (senal?: AbortSignal) => {
      void api
        .resenasDe(restauranteId, senal)
        .then((r) => {
          setResenas(r.resenas)
          setResumen(r.resumen)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!senal?.aborted) setCargando(false)
        })

      if (comensal) {
        void api
          .visitasSinResenar(restauranteId, senal)
          .then(setPendientes)
          .catch(() => undefined)
      } else {
        setPendientes([])
      }
    },
    [restauranteId, comensal],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    traer(ctrl.signal)
    return () => ctrl.abort()
  }, [traer])

  const total = resumen?.total ?? 0

  return (
    <section>
      <h2 className="mt-12 mb-6 border-t border-regla pt-8 text-[28px]">
        {total === 0
          ? 'Todavía no tiene reseñas'
          : `Lo que dijeron ${total} ${total === 1 ? 'comensal' : 'comensales'}`}
      </h2>

      {total > 0 && resumen && <Resumen resumen={resumen} />}

      {pendientes.length > 0 && (
        <Escribir visita={pendientes[0]!} onPublicada={() => traer()} />
      )}

      {!comensal && total > 0 && (
        <p className="mb-6 rounded-r-panel border-l-[3px] border-regla-2 bg-superficie-2 px-4.5 py-3.5 text-[13.5px] leading-relaxed text-tinta-2">
          Para dejar tu reseña necesitás una cuenta verificada y una visita registrada en este local.{' '}
          <Link to="/registro">Crear cuenta</Link>
        </p>
      )}

      {comensal && pendientes.length === 0 && !resenas.some((r) => r.mia) && (
        <p className="mb-6 flex items-start gap-3 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-4.5 py-3.5 text-[13.5px] leading-relaxed text-tinta-2">
          <Aviso tam={17} className="mt-0.5 shrink-0 text-ambar" />
          <span>
            <strong className="font-semibold text-tinta">
              Solo puede reseñar quien visitó el local.
            </strong>{' '}
            Reservá una mesa y, cuando pase la visita, vas a poder contar cómo te fue.
          </span>
        </p>
      )}

      {cargando && <p className="text-sm text-tinta-3">Cargando reseñas…</p>}

      {resenas.map((r) => (
        <Ficha key={r.id} resena={r} />
      ))}
    </section>
  )
}

function Resumen({ resumen }: { resumen: ResumenResenas }) {
  return (
    <div className="mb-8 grid gap-10 sm:grid-cols-[236px_minmax(0,1fr)]">
      <div>
        <div className="font-display text-[56px] leading-none font-semibold tracking-[-0.03em] text-vino">
          {(resumen.promedio ?? 0).toFixed(1).replace('.', ',')}
        </div>
        <p className="mt-2 font-mono text-[11.5px] tracking-wider text-tinta-3">
          SOBRE 5 · {resumen.total} {resumen.total === 1 ? 'RESEÑA' : 'RESEÑAS'}
          <br />
          DE VISITAS VERIFICADAS
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const cantidad = resumen.distribucion[String(n)] ?? 0
          const porcentaje = resumen.total === 0 ? 0 : (cantidad / resumen.total) * 100
          return (
            <div key={n} className="grid grid-cols-[18px_minmax(0,1fr)_42px] items-center gap-3">
              <span className="font-mono text-xs text-tinta-3">{n}</span>
              <div className="h-1.5 overflow-hidden rounded-sm bg-superficie-3">
                <span className="block h-full bg-vino" style={{ width: `${porcentaje}%` }} />
              </div>
              <span className="text-right font-mono text-xs text-tinta-2">{cantidad}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Escribir({
  visita,
  onPublicada,
}: {
  visita: VisitaSinResenar
  onPublicada: () => void
}) {
  const [puntuacion, setPuntuacion] = useState(0)
  const [sobrevolada, setSobrevolada] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ganados, setGanados] = useState<number | null>(null)

  const activa = sobrevolada || puntuacion
  const nombres = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente']

  async function publicar() {
    if (puntuacion === 0) return
    setError(null)
    setEnviando(true)

    try {
      const r = await api.publicarResena({
        reservaId: visita.reservaId,
        puntuacion,
        comentario: comentario.trim() || undefined,
      })
      setGanados(r.puntosGanados)
      onPublicada()
    } catch (e) {
      setError(
        e instanceof ErrorApi ? (e.detalle ?? 'No pudimos publicar la reseña.') : 'Error de conexión.',
      )
    } finally {
      setEnviando(false)
    }
  }

  if (ganados !== null) {
    return (
      <div className="mb-8 rounded-r-panel border-l-[3px] border-verde bg-verde-suave px-5 py-4">
        <p className="m-0 text-sm leading-relaxed text-tinta-2">
          <strong className="font-semibold text-tinta">Tu reseña quedó publicada.</strong> Sumaste{' '}
          <strong className="font-semibold text-ambar">{ganados} puntos</strong>, que podés canjear
          desde <Link to="/cuenta">tu cuenta</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="panel mb-8 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-regla bg-superficie-2 px-5 py-3.5">
        <b className="mr-auto font-display text-lg font-semibold">Contá cómo te fue</b>
        <span className="chip chip-verde">VISITA VERIFICADA</span>
      </div>

      <div className="px-5 py-5">
        <p className="mb-5 flex items-center gap-3 rounded-r-[10px] border-l-[3px] border-verde bg-verde-suave px-4 py-3 text-[13px] leading-snug text-tinta-2">
          Tu reseña queda ligada a la reserva del{' '}
          <strong className="font-semibold text-tinta">{formatearFecha(visita.fecha)}</strong> a las{' '}
          {visita.hora}. Por eso se publica como verificada.
        </p>

        <span className="volanta mb-2.5 block text-tinta-3">Tu puntuación</span>
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex gap-0.5" onMouseLeave={() => setSobrevolada(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} de 5`}
                onClick={() => setPuntuacion(n)}
                onMouseEnter={() => setSobrevolada(n)}
                className="cursor-pointer border-0 bg-transparent p-0.5 leading-none"
              >
                <Estrella
                  tam={32}
                  className={n <= activa ? 'text-vino' : 'text-regla-2'}
                />
              </button>
            ))}
          </div>
          <span
            className={`text-[15px] ${activa ? 'font-semibold text-tinta' : 'text-tinta-3'}`}
          >
            {activa ? `${nombres[activa]} · ${activa} de 5` : 'Elegí de 1 a 5'}
          </span>
        </div>

        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="volanta text-tinta-3">
            Tu comentario{' '}
            <span className="font-normal tracking-normal normal-case">(opcional)</span>
          </span>
          <span className="font-mono text-[11.5px] text-tinta-3">
            {comentario.length.toLocaleString('es-AR')} / 1.500
          </span>
        </div>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={1500}
          placeholder="¿Qué pediste? ¿Cómo estuvo la atención? Contale a otro comensal lo que te hubiera gustado saber antes de ir."
          className="min-h-[118px] w-full resize-y rounded-[12px] border border-regla-2 bg-superficie px-4 py-3.5 text-[15px] leading-relaxed text-tinta outline-none placeholder:text-tinta-3 focus:border-vino"
        />

        <p className="mt-3 text-[12.5px] leading-snug text-tinta-3">
          No publiques datos personales de terceros ni contenido ofensivo. El local puede responder
          públicamente, pero no puede pedir que borremos tu reseña por resultarle desfavorable.
        </p>

        {error && (
          <p className="mt-3 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13px] text-tinta-2">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-regla pt-5">
          <BotonSpecular disabled={puntuacion === 0 || enviando} onClick={() => void publicar()}>
            {enviando ? 'Publicando…' : 'Publicar reseña'}
          </BotonSpecular>
          <span className="chip chip-ambar">+{PUNTOS_POR_RESENA} PUNTOS</span>
          <span className="text-[13px] text-tinta-3">
            {puntuacion === 0 ? 'Elegí una puntuación para poder publicar.' : 'Podés editarla después.'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Ficha({ resena }: { resena: Resena }) {
  return (
    <article
      className={`border-t border-regla py-5 ${resena.mia ? 'rounded-r-panel border-l-[3px] border-l-vino bg-vino-suave px-4.5' : ''}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
        <span className="font-display text-lg font-semibold">{resena.autor}</span>
        {resena.verificada && <span className="chip chip-verde">VISITA VERIFICADA</span>}
        {resena.mia && <span className="chip chip-vino">TU RESEÑA</span>}
        <span className="ml-auto font-mono text-[11.5px] text-tinta-3">
          {fechaLarga(resena.fecha)}
          {resena.editada && ' · editada'}
        </span>
        <span className="font-mono text-base font-medium text-vino">
          {resena.puntuacion.toFixed(1).replace('.', ',')}
        </span>
      </div>

      {resena.comentario && (
        <p className="m-0 text-[15.5px] leading-relaxed text-tinta-2">{resena.comentario}</p>
      )}

      {resena.respuesta && (
        <div className="mt-4 ml-6 rounded-r-panel border-l-[3px] border-regla-2 bg-superficie-2 px-4.5 py-3.5">
          <p className="volanta m-0 mb-1.5 text-tinta-3">Respuesta del restaurante</p>
          <p className="m-0 text-sm leading-relaxed text-tinta-2">{resena.respuesta}</p>
        </div>
      )}
    </article>
  )
}
