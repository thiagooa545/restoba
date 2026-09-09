import { formatearFecha, type Reserva } from '@restoba/compartido'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import * as api from '../lib/cliente'
import { ErrorApi } from '../lib/cliente'
import { Pin } from './Iconos'

const ETIQUETA: Record<Reserva['estado'], { texto: string; clase: string }> = {
  confirmada: { texto: 'CONFIRMADA', clase: 'chip chip-verde' },
  cumplida: { texto: 'VISITADA', clase: 'chip' },
  cancelada: { texto: 'CANCELADA', clase: 'chip' },
  no_show: { texto: 'NO ASISTIÓ', clase: 'chip chip-ambar' },
}

export function MisReservas() {
  const [reservas, setReservas] = useState<Reserva[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<number | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    api
      .misReservas(ctrl.signal)
      .then(setReservas)
      .catch(() => {
        if (!ctrl.signal.aborted) setReservas([])
      })
    return () => ctrl.abort()
  }, [])

  async function cancelar(id: number) {
    setError(null)
    setCancelando(id)
    try {
      const { reserva } = await api.cancelarReserva(id)
      setReservas((previas) => (previas ?? []).map((r) => (r.id === id ? reserva : r)))
    } catch (e) {
      setError(
        e instanceof ErrorApi ? (e.detalle ?? 'No pudimos cancelar la reserva.') : 'Error de conexión.',
      )
    } finally {
      setCancelando(null)
    }
  }

  if (reservas === null) {
    return <p className="py-6 text-sm text-tinta-3">Cargando tus reservas…</p>
  }

  if (reservas.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-regla-2 bg-superficie-2 px-6 py-8 text-center">
        <p className="m-0 mb-1 font-display text-lg font-semibold">Todavía no reservaste nada</p>
        <p className="m-0 mb-4 text-sm text-tinta-3">
          Cuando reserves y visites un lugar vas a poder dejar tu reseña.
        </p>
        <Link to="/buscar" className="boton boton-fantasma boton-chico no-underline">
          Buscar dónde comer
        </Link>
      </div>
    )
  }

  const proximas = reservas.filter((r) => r.estado === 'confirmada' && !r.cumplida)
  const pasadas = reservas.filter((r) => r.estado !== 'confirmada' || r.cumplida)

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] text-tinta-2">
          {error}
        </p>
      )}

      {proximas.length > 0 && (
        <Grupo titulo="Próximas">
          {proximas.map((r) => (
            <Ficha key={r.id} reserva={r} cancelando={cancelando === r.id} onCancelar={cancelar} />
          ))}
        </Grupo>
      )}

      {pasadas.length > 0 && (
        <Grupo titulo="Anteriores">
          {pasadas.map((r) => (
            <Ficha key={r.id} reserva={r} cancelando={false} onCancelar={cancelar} />
          ))}
        </Grupo>
      )}
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <p className="volanta mb-2.5 text-tinta-3">{titulo}</p>
      <ul className="m-0 grid list-none gap-2.5 p-0">{children}</ul>
    </section>
  )
}

function Ficha({
  reserva,
  cancelando,
  onCancelar,
}: {
  reserva: Reserva
  cancelando: boolean
  onCancelar: (id: number) => void
}) {
  const etiqueta = ETIQUETA[reserva.estado]
  const apagada = reserva.estado === 'cancelada'

  return (
    <li
      className={`rounded-panel border border-regla bg-superficie px-5 py-4 ${apagada ? 'opacity-60' : ''}`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
        <Link
          to={`/restaurante/${reserva.restauranteId}`}
          className="mr-auto font-display text-lg font-semibold text-tinta no-underline hover:text-vino"
        >
          {reserva.restaurante}
        </Link>
        <span className={etiqueta.clase}>{etiqueta.texto}</span>
      </div>

      <p className="m-0 mb-1 font-mono text-sm text-tinta">
        {formatearFecha(reserva.fecha)} · {reserva.hora} ·{' '}
        {reserva.personas === 1 ? '1 persona' : `${reserva.personas} personas`}
        {reserva.mesa && ` · mesa ${reserva.mesa}`}
      </p>

      <p className="m-0 flex items-center gap-1.5 text-[12.5px] text-tinta-3">
        <Pin tam={12} />
        {reserva.direccion}
      </p>

      {reserva.cumplida && reserva.estado === 'confirmada' && (
        <p className="mt-2.5 mb-0 rounded-r-[10px] border-l-[3px] border-verde bg-verde-suave px-3.5 py-2.5 text-[13px] leading-snug text-tinta-2">
          Esta visita ya pasó, así que podés dejar tu reseña. La carga de reseñas es lo próximo que
          entra.
        </p>
      )}

      {reserva.cancelable && (
        <button
          type="button"
          onClick={() => onCancelar(reserva.id)}
          disabled={cancelando}
          className="boton boton-fantasma boton-chico mt-3"
        >
          {cancelando ? 'Cancelando…' : 'Cancelar reserva'}
        </button>
      )}

      {reserva.estado === 'confirmada' && !reserva.cancelable && !reserva.cumplida && (
        <p className="mt-2.5 mb-0 text-[12.5px] text-tinta-3">
          Ya pasó el plazo para cancelar por acá. Llamá al local.
        </p>
      )}
    </li>
  )
}
