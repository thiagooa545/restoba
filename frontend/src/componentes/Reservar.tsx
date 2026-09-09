import {
  formatearFecha,
  hoyEnBuenosAires,
  sumarDias,
  type Disponibilidad,
  type Reserva,
} from '@restoba/compartido'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import * as api from '../lib/cliente'
import { ErrorApi } from '../lib/cliente'
import { useSesion } from '../lib/Sesion'
import { Aviso, Reloj } from './Iconos'

const PERSONAS = [2, 4, 6, 8]

/** Se ofrece reservar hasta con un mes de anticipación. */
const DIAS_A_FUTURO = 30

export function Reservar({ restauranteId, nombre }: { restauranteId: number; nombre: string }) {
  const { comensal } = useSesion()
  const hoy = hoyEnBuenosAires()

  const [fecha, setFecha] = useState(hoy)
  const [personas, setPersonas] = useState(2)
  const [hora, setHora] = useState<string | null>(null)
  const [disp, setDisp] = useState<Disponibilidad | null>(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecha, setHecha] = useState<Reserva | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setCargando(true)
    setHora(null)

    api
      .disponibilidad(restauranteId, fecha, personas, ctrl.signal)
      .then(setDisp)
      .catch(() => undefined)
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })

    return () => ctrl.abort()
  }, [restauranteId, fecha, personas])

  async function confirmar() {
    if (!hora) return
    setError(null)
    setEnviando(true)

    try {
      const { reserva } = await api.reservar({ restauranteId, fecha, hora, personas })
      setHecha(reserva)
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos confirmar la reserva.')
          : 'No pudimos conectarnos.',
      )
      // Los turnos pudieron cambiar mientras tanto.
      api.disponibilidad(restauranteId, fecha, personas).then(setDisp).catch(() => undefined)
    } finally {
      setEnviando(false)
    }
  }

  if (hecha) {
    return (
      <Panel titulo="Reserva confirmada">
        <div className="rounded-r-[10px] border-l-[3px] border-verde bg-verde-suave px-4 py-3.5">
          <p className="m-0 text-sm leading-relaxed text-tinta-2">
            Te esperamos en <strong className="font-semibold text-tinta">{nombre}</strong> el{' '}
            <strong className="font-semibold text-tinta">{formatearFecha(hecha.fecha)}</strong> a las{' '}
            <strong className="font-semibold text-tinta">{hecha.hora}</strong>, mesa {hecha.mesa} para{' '}
            {hecha.personas}.
          </p>
        </div>
        <p className="mt-3.5 text-[12.5px] leading-snug text-tinta-3">
          Podés cancelarla desde <Link to="/cuenta">tu cuenta</Link>. Cuando pase la visita vas a
          poder dejar tu reseña.
        </p>
      </Panel>
    )
  }

  // Visitante y Usuario Registrado ven por qué no pueden reservar todavía.
  if (!comensal) {
    return (
      <Panel titulo="Reservar mesa">
        <p className="m-0 mb-4 text-sm leading-relaxed text-tinta-2">
          Para reservar necesitás una cuenta verificada. Buscar y ver la carta es libre.
        </p>
        <Link to="/registro" className="boton boton-vino w-full no-underline">
          Crear cuenta
        </Link>
        <p className="mt-3 text-center text-[12.5px] text-tinta-3">
          ¿Ya tenés una? <Link to="/ingresar">Ingresá</Link>
        </p>
      </Panel>
    )
  }

  if (!comensal.legal.verificado) {
    const faltan = [
      !comensal.emailVerificado && 'confirmar tu correo',
      !comensal.telefonoVerificado && 'confirmar tu teléfono',
      !comensal.legal.documentosAceptados && 'aceptar el marco legal',
    ].filter(Boolean) as string[]

    return (
      <Panel titulo="Reservar mesa">
        <div className="mb-4 flex items-start gap-3 rounded-r-[10px] border-l-[3px] border-ambar bg-ambar-suave px-4 py-3">
          <Aviso tam={17} className="mt-0.5 shrink-0 text-ambar" />
          <p className="m-0 text-[13px] leading-snug text-tinta-2">
            Te falta {faltan.join(', ')} para poder reservar.
          </p>
        </div>
        <Link to="/cuenta" className="boton boton-vino w-full no-underline">
          Verificar mi cuenta
        </Link>
      </Panel>
    )
  }

  const turnos = disp?.turnos ?? []
  const hayLibres = turnos.some((t) => t.libre)
  const noEntra = disp && personas > disp.capacidadMaxima

  return (
    <Panel titulo="Reservar mesa">
      <label className="mb-4 block">
        <span className="volanta mb-1.5 block text-tinta-3">Fecha</span>
        <input
          type="date"
          value={fecha}
          min={hoy}
          max={sumarDias(hoy, DIAS_A_FUTURO)}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3.5 py-2.5 font-mono text-sm text-tinta outline-none focus:border-vino"
        />
      </label>

      <span className="volanta mb-1.5 block text-tinta-3">Personas</span>
      <div className="mb-4 flex gap-1.5">
        {PERSONAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPersonas(n)}
            className={`grow cursor-pointer rounded-[10px] border py-2 font-mono text-sm transition ${
              personas === n
                ? 'border-vino bg-vino-suave font-semibold text-vino'
                : 'border-regla-2 bg-superficie text-tinta-2 hover:border-regla-2'
            }`}
          >
            {n === 8 ? '8+' : n}
          </button>
        ))}
      </div>

      <span className="volanta mb-1.5 block text-tinta-3">Horario</span>

      {cargando && <p className="m-0 py-3 text-sm text-tinta-3">Buscando turnos…</p>}

      {!cargando && noEntra && (
        <Nota>
          La mesa más grande de este local es para {disp?.capacidadMaxima}. Para un grupo más grande,
          llamalos.
        </Nota>
      )}

      {!cargando && !noEntra && disp && !disp.abierto && (
        <Nota>Ese día el local no atiende. Probá con otra fecha.</Nota>
      )}

      {!cargando && !noEntra && disp?.abierto && !hayLibres && (
        <Nota>No quedan turnos libres para ese día y ese grupo.</Nota>
      )}

      {!cargando && !noEntra && hayLibres && (
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {turnos.map((t) => (
            <button
              key={t.hora}
              type="button"
              disabled={!t.libre}
              onClick={() => setHora(t.hora)}
              title={t.libre ? `${t.mesasLibres} mesas libres` : 'Sin mesas en ese turno'}
              className={`cursor-pointer rounded-[8px] border py-1.5 font-mono text-[12.5px] transition disabled:cursor-not-allowed disabled:border-regla disabled:bg-superficie-2 disabled:text-tinta-3 disabled:line-through ${
                hora === t.hora
                  ? 'border-vino bg-vino font-semibold text-sobre-vino'
                  : 'border-regla-2 bg-superficie text-tinta-2 hover:border-vino hover:text-vino'
              }`}
            >
              {t.hora}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13px] leading-snug text-tinta-2">
          {error}
        </p>
      )}

      <button
        type="button"
        className="boton boton-vino w-full"
        disabled={!hora || enviando}
        onClick={() => void confirmar()}
      >
        {enviando ? 'Confirmando…' : hora ? `Reservar a las ${hora}` : 'Elegí un horario'}
      </button>

      <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-snug text-tinta-3">
        <Reloj tam={13} className="mt-0.5 shrink-0" />
        Cancelás sin costo hasta 2 horas antes. La mesa se reserva por 2 horas.
      </p>
    </Panel>
  )
}

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-regla bg-superficie-2 px-5 py-3.5">
        <b className="font-display text-lg font-semibold">{titulo}</b>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-r-[10px] border-l-[3px] border-regla-2 bg-superficie-2 px-4 py-3 text-[13px] leading-snug text-tinta-2">
      {children}
    </p>
  )
}
