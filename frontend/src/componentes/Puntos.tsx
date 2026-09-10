import {
  fechaLarga,
  nombreMotivo,
  PUNTOS_POR_RESENA,
  PUNTOS_POR_VISITA,
  type EstadoPuntos,
} from '@restoba/compartido'
import { useEffect, useState } from 'react'
import * as api from '../lib/cliente'
import { ErrorApi } from '../lib/cliente'
import { Aviso, Estrella } from './Iconos'

export function Puntos({ verificado }: { verificado: boolean }) {
  const [estado, setEstado] = useState<EstadoPuntos | null>(null)
  const [canjeando, setCanjeando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    api.misPuntos(ctrl.signal).then(setEstado).catch(() => undefined)
    return () => ctrl.abort()
  }, [])

  async function canjear(cupon: string) {
    setError(null)
    setCanjeando(cupon)
    try {
      const r = await api.canjearPuntos(cupon)
      setEstado(r.estado)
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos hacer el canje.') : 'Error de conexión.')
    } finally {
      setCanjeando(null)
    }
  }

  if (!estado) return <p className="py-6 text-sm text-tinta-3">Cargando tus puntos…</p>

  return (
    <div>
      <div className="panel mb-6 overflow-hidden">
        <div className="grid gap-px bg-regla sm:grid-cols-2">
          <div className="bg-superficie px-6 py-6">
            <p className="volanta mb-2 text-tinta-3">Saldo disponible</p>
            <p className="m-0 font-display text-[44px] leading-none font-semibold text-ambar">
              {estado.saldo.toLocaleString('es-AR')}
            </p>
            <p className="m-0 mt-2 text-[13px] text-tinta-3">puntos</p>
          </div>
          <div className="bg-superficie px-6 py-6">
            <p className="volanta mb-2 text-tinta-3">Acumulado histórico</p>
            <p className="m-0 font-display text-[44px] leading-none font-semibold">
              {estado.acumuladoHistorico.toLocaleString('es-AR')}
            </p>
            <p className="m-0 mt-2 text-[13px] text-tinta-3">
              {PUNTOS_POR_VISITA} por visita · {PUNTOS_POR_RESENA} por reseña
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-5 rounded-r-panel border-l-[3px] border-vino bg-vino-suave px-4.5 py-3.5 text-[13.5px] text-tinta-2">
          {error}
        </p>
      )}

      {/* Canje */}
      <p className="volanta mb-3 text-tinta-3">Canjear puntos</p>
      <ul className="m-0 mb-6 grid list-none gap-2.5 p-0 sm:grid-cols-3">
        {estado.catalogo.map((c) => (
          <li
            key={c.id}
            className={`flex flex-col rounded-panel border bg-superficie px-4.5 py-4 ${
              c.alcanza ? 'border-ambar/40' : 'border-regla'
            }`}
          >
            <Estrella tam={17} className={c.alcanza ? 'mb-2 text-ambar' : 'mb-2 text-tinta-3'} />
            <p className="m-0 mb-1 font-display text-[17px] leading-tight font-semibold">{c.titulo}</p>
            <p className="m-0 mb-3.5 font-mono text-[12.5px] text-tinta-3">
              {c.puntos.toLocaleString('es-AR')} puntos
            </p>
            <button
              type="button"
              className="boton boton-fantasma boton-chico mt-auto"
              disabled={!c.alcanza || !verificado || canjeando !== null}
              onClick={() => void canjear(c.id)}
            >
              {canjeando === c.id ? 'Canjeando…' : c.alcanza ? 'Canjear' : 'Te faltan puntos'}
            </button>
          </li>
        ))}
      </ul>

      <p className="mb-7 flex items-start gap-3 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-4.5 py-3.5 text-[13px] leading-relaxed text-tinta-2">
        <Aviso tam={17} className="mt-0.5 shrink-0 text-ambar" />
        <span>
          Los Puntos <strong className="font-semibold text-tinta">no son dinero</strong>: no se
          cambian por efectivo, no se transfieren y el canje es irreversible (Términos y
          Condiciones, art. 8).
        </span>
      </p>

      {estado.cupones.length > 0 && (
        <>
          <p className="volanta mb-3 text-tinta-3">Tus cupones</p>
          <ul className="m-0 mb-7 grid list-none gap-2.5 p-0">
            {estado.cupones.map((c) => {
              const inactivo = c.usado || c.vencido
              return (
                <li
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 rounded-panel border border-dashed border-regla-2 bg-superficie px-4.5 py-3.5 ${inactivo ? 'opacity-55' : ''}`}
                >
                  <span className="font-mono text-lg tracking-[0.14em] text-vino">{c.codigo}</span>
                  <span className="text-sm text-tinta">{c.titulo}</span>
                  <span className="ml-auto font-mono text-[11.5px] text-tinta-3">
                    {c.usado ? 'YA USADO' : c.vencido ? 'VENCIDO' : `VENCE ${c.venceEn}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Movimientos */}
      <p className="volanta mb-3 text-tinta-3">Movimientos</p>
      {estado.movimientos.length === 0 ? (
        <p className="rounded-panel border border-dashed border-regla-2 bg-superficie-2 px-6 py-8 text-center text-sm text-tinta-3">
          Todavía no tenés movimientos. Reservá una mesa y sumá tus primeros {PUNTOS_POR_VISITA}{' '}
          puntos.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-px overflow-hidden rounded-panel border border-regla bg-regla p-0">
          {estado.movimientos.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 bg-superficie px-4.5 py-3">
              <span className="text-sm text-tinta">{nombreMotivo(m.motivo)}</span>
              {m.restaurante && (
                <span className="text-[13px] text-tinta-3">· {m.restaurante}</span>
              )}
              {!m.restaurante && m.detalle && (
                <span className="text-[13px] text-tinta-3">· {m.detalle}</span>
              )}
              <span className="ml-auto font-mono text-[11.5px] text-tinta-3">
                {fechaLarga(m.fecha)}
              </span>
              <span
                className={`w-16 text-right font-mono text-sm font-medium ${m.puntos > 0 ? 'text-verde' : 'text-vino'}`}
              >
                {m.puntos > 0 ? '+' : ''}
                {m.puntos.toLocaleString('es-AR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
