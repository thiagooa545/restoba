import type { ComensalPublico } from '@restoba/shared'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import * as api from '../api/cliente'
import { ErrorApi } from '../api/cliente'
import { Encabezado } from '../componentes/Encabezado'
import { GateLegal } from '../componentes/GateLegal'
import { Aviso, Telefono } from '../componentes/Iconos'
import { useSesion } from '../contextos/Sesion'

export function Cuenta() {
  const { comensal, cargando, actualizar, cerrar } = useSesion()

  if (cargando) {
    return (
      <Marco>
        <p className="py-24 text-center text-tinta-3">Cargando tu cuenta…</p>
      </Marco>
    )
  }

  if (!comensal) return <Navigate to="/ingresar" replace />

  const { legal } = comensal
  const pasoEmail = !comensal.emailVerificado
  const pasoTelefono = comensal.emailVerificado && !comensal.telefonoVerificado
  const pasoLegal = comensal.emailVerificado && comensal.telefonoVerificado && !legal.documentosAceptados

  return (
    <Marco>
      <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-8">
        <p className="volanta mb-3 text-vino">Tu cuenta</p>
        <h1 className="mb-3 text-[clamp(2rem,5vw,2.6rem)] leading-tight">
          {legal.verificado ? `Todo listo, ${comensal.nombre.split(' ')[0]}` : 'Verificá tu cuenta'}
        </h1>
        <p className="mb-8 max-w-2xl font-display text-lg leading-relaxed text-tinta-2">
          {legal.verificado
            ? 'Tu cuenta está verificada: podés reservar mesa, publicar reseñas y sumar puntos.'
            : 'Son tres pasos. Hasta completarlos podés buscar, ver menús y leer reseñas, pero no reservar ni reseñar.'}
        </p>

        {/* Progreso */}
        <ol className="mb-9 grid list-none gap-2.5 p-0 sm:grid-cols-3">
          <Paso numero={1} titulo="Correo" hecho={comensal.emailVerificado} actual={pasoEmail} />
          <Paso
            numero={2}
            titulo="Teléfono"
            hecho={comensal.telefonoVerificado}
            actual={pasoTelefono}
          />
          <Paso
            numero={3}
            titulo="Marco legal"
            hecho={legal.documentosAceptados}
            actual={pasoLegal}
          />
        </ol>

        {pasoEmail && <VerificarEmail email={comensal.email} onListo={actualizar} />}
        {pasoTelefono && <VerificarTelefono onListo={actualizar} />}
        {pasoLegal && <GateLegal comensal={comensal} onActualizar={actualizar} />}

        {legal.verificado && <Verificada comensal={comensal} onActualizar={actualizar} />}

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-regla pt-6">
          <span className="text-sm text-tinta-3">
            Sesión iniciada como <strong className="font-semibold text-tinta-2">{comensal.email}</strong>
          </span>
          <button type="button" onClick={() => void cerrar()} className="boton boton-fantasma boton-chico ml-auto">
            Cerrar sesión
          </button>
        </div>
      </div>
    </Marco>
  )
}

// ── Paso 1: correo ──────────────────────────────────────────

function VerificarEmail({
  email,
  onListo,
}: {
  email: string
  onListo: (c: ComensalPublico) => void
}) {
  return (
    <VerificarCodigo
      titulo="Confirmá tu correo"
      bajada={`Te mandamos un código de 6 dígitos a ${email}.`}
      accionVerificar={api.verificarEmail}
      accionReenviar={api.reenviarCodigoEmail}
      onListo={onListo}
    />
  )
}

// ── Paso 2: teléfono ────────────────────────────────────────

function VerificarTelefono({ onListo }: { onListo: (c: ComensalPublico) => void }) {
  const [telefono, setTelefono] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [codigoDemo, setCodigoDemo] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function mandar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const r = await api.guardarTelefono(telefono)
      setCodigoDemo(r.codigoDemo)
      setEnviado(true)
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos guardar el teléfono.') : 'Error de conexión.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <VerificarCodigo
        titulo="Confirmá tu teléfono"
        bajada={`Te mandamos un código de 6 dígitos al ${telefono}.`}
        codigoDemo={codigoDemo}
        accionVerificar={api.verificarTelefono}
        onListo={onListo}
      />
    )
  }

  return (
    <section className="overflow-hidden rounded-panel border border-regla bg-superficie shadow-panel">
      <div className="border-b border-regla bg-superficie-2 px-5 py-3.5">
        <b className="font-display text-[17px] font-semibold">Agregá tu teléfono</b>
      </div>
      <form onSubmit={mandar} className="px-5 py-5">
        <p className="mb-4 text-sm leading-relaxed text-tinta-2">
          Lo guardamos <strong className="font-semibold text-tinta">cifrado con AES-256-GCM</strong>,
          nunca en texto legible, y no se lo mostramos a los restaurantes. Solo se usa para confirmar
          que sos vos.
        </p>

        {error && (
          <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] text-tinta-2">
            {error}
          </p>
        )}

        <label className="mb-4 block">
          <span className="volanta mb-1.5 block text-tinta-3">Teléfono</span>
          <span className="flex items-center gap-2.5 rounded-[10px] border border-regla-2 bg-superficie px-3.5 py-2.5 focus-within:border-vino">
            <Telefono tam={16} className="shrink-0 text-tinta-3" />
            <input
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 11 5555-1234"
              className="w-full bg-transparent text-[15px] text-tinta outline-none placeholder:text-tinta-3"
            />
          </span>
        </label>

        <button type="submit" className="boton boton-vino" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviarme el código'}
        </button>
      </form>
    </section>
  )
}

// ── Cuadro genérico de código ───────────────────────────────

function VerificarCodigo({
  titulo,
  bajada,
  codigoDemo: codigoInicial,
  accionVerificar,
  accionReenviar,
  onListo,
}: {
  titulo: string
  bajada: string
  codigoDemo?: string
  accionVerificar: (codigo: string) => Promise<{ comensal: ComensalPublico }>
  accionReenviar?: () => Promise<{ ok: boolean; codigoDemo?: string }>
  onListo: (c: ComensalPublico) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [codigoDemo, setCodigoDemo] = useState(codigoInicial)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const r = await accionVerificar(codigo)
      onListo(r.comensal)
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'Ese código no es correcto.') : 'Error de conexión.')
    } finally {
      setEnviando(false)
    }
  }

  async function reenviar() {
    if (!accionReenviar) return
    setError(null)
    try {
      const r = await accionReenviar()
      setCodigoDemo(r.codigoDemo)
    } catch {
      setError('No pudimos reenviar el código.')
    }
  }

  return (
    <section className="overflow-hidden rounded-panel border border-regla bg-superficie shadow-panel">
      <div className="border-b border-regla bg-superficie-2 px-5 py-3.5">
        <b className="font-display text-[17px] font-semibold">{titulo}</b>
      </div>

      <form onSubmit={enviar} className="px-5 py-5">
        <p className="mb-4 text-sm leading-relaxed text-tinta-2">{bajada}</p>

        {/* En desarrollo no hay servidor de correo ni de SMS: el código se
            muestra acá para poder recorrer el flujo completo. */}
        {codigoDemo && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-r-[10px] border-l-[3px] border-ambar bg-ambar-suave px-4 py-3">
            <Aviso tam={17} className="shrink-0 text-ambar" />
            <p className="m-0 text-[13px] leading-snug text-tinta-2">
              <strong className="font-semibold text-tinta">Modo desarrollo:</strong> todavía no hay
              envío de correo ni SMS, así que el código va acá.
            </p>
            <code className="ml-auto rounded-[8px] border border-ambar/35 bg-superficie px-3 py-1.5 font-mono text-lg tracking-[0.2em] text-ambar">
              {codigoDemo}
            </code>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] text-tinta-2">
            {error}
          </p>
        )}

        <label className="mb-4 block">
          <span className="volanta mb-1.5 block text-tinta-3">Código de 6 dígitos</span>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full max-w-[220px] rounded-[10px] border border-regla-2 bg-superficie px-3.5 py-2.5 text-center font-mono text-xl tracking-[0.35em] text-tinta outline-none focus:border-vino"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="boton boton-vino" disabled={enviando || codigo.length !== 6}>
            {enviando ? 'Verificando…' : 'Confirmar'}
          </button>
          {accionReenviar && (
            <button
              type="button"
              onClick={() => void reenviar()}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-vino underline underline-offset-2"
            >
              Reenviar el código
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

// ── Estado final ────────────────────────────────────────────

function Verificada({
  comensal,
  onActualizar,
}: {
  comensal: ComensalPublico
  onActualizar: (c: ComensalPublico) => void
}) {
  const [revocando, setRevocando] = useState(false)

  async function revocar() {
    setRevocando(true)
    try {
      const r = await api.revocarAceptaciones()
      onActualizar(r.comensal)
    } finally {
      setRevocando(false)
    }
  }

  return (
    <section>
      <div className="mb-5 overflow-hidden rounded-panel border border-verde/40 bg-verde-suave">
        <div className="px-5 py-5">
          <p className="volanta mb-2.5 text-verde">Usuario Verificado</p>
          <p className="m-0 mb-4 text-[15px] leading-relaxed text-tinta-2">
            Quedó registrada la constancia de aceptación de los tres documentos, con la fecha, la
            versión y la huella SHA-256 del texto que se te exhibió. Esa constancia es la prueba del
            consentimiento y se conserva aunque des de baja la cuenta.
          </p>
          <ul className="m-0 grid list-none gap-1.5 p-0 text-sm text-tinta-2">
            <li>· Reservar mesa</li>
            <li>· Publicar reseñas de los lugares que visitaste</li>
            <li>· Acumular y canjear puntos</li>
            <li>· Distintivo de verificado en tu perfil</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-panel border border-regla bg-regla sm:grid-cols-2">
        <div className="bg-superficie px-5 py-4">
          <p className="volanta mb-1.5 text-tinta-3">Correo</p>
          <p className="m-0 text-sm text-tinta">{comensal.email}</p>
        </div>
        <div className="bg-superficie px-5 py-4">
          <p className="volanta mb-1.5 text-tinta-3">Teléfono</p>
          <p className="m-0 font-mono text-sm text-tinta">{comensal.telefono ?? '—'}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-r-panel border-l-[3px] border-regla-2 bg-superficie-2 px-4.5 py-4">
        <p className="m-0 grow text-[13.5px] leading-relaxed text-tinta-2">
          Podés <strong className="font-semibold text-tinta">revocar</strong> tu aceptación cuando
          quieras. La cuenta vuelve al nivel de Usuario Registrado y no se borra ninguno de tus
          datos: la constancia queda marcada como revocada, no se elimina.
        </p>
        <button
          type="button"
          onClick={() => void revocar()}
          disabled={revocando}
          className="boton boton-fantasma boton-chico shrink-0"
        >
          {revocando ? 'Revocando…' : 'Revocar aceptación'}
        </button>
      </div>
    </section>
  )
}

// ── Piezas ──────────────────────────────────────────────────

function Paso({
  numero,
  titulo,
  hecho,
  actual,
}: {
  numero: number
  titulo: string
  hecho: boolean
  actual: boolean
}) {
  return (
    <li
      className={`grid grid-cols-[26px_minmax(0,1fr)] items-center gap-3 rounded-boton border px-4 py-3 ${
        hecho
          ? 'border-verde/40 bg-verde-suave'
          : actual
            ? 'border-vino bg-vino-suave'
            : 'border-regla bg-superficie'
      }`}
    >
      <span
        className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border font-mono text-xs ${
          hecho
            ? 'border-verde bg-verde text-papel'
            : actual
              ? 'border-vino bg-superficie text-vino'
              : 'border-regla-2 bg-papel text-tinta-3'
        }`}
      >
        {hecho ? '✓' : numero}
      </span>
      <span className="text-sm font-semibold text-tinta">{titulo}</span>
    </li>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-papel">
      <Encabezado compacto>
        <Link to="/buscar" className="hidden text-[13.5px] font-semibold text-tinta-2 no-underline hover:text-tinta sm:block">
          Volver al buscador
        </Link>
      </Encabezado>
      {children}
    </div>
  )
}
