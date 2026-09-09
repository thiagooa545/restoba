import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErrorApi } from '../lib/cliente'
import { Campo, ErrorForm, MarcoAuth } from '../componentes/MarcoAuth'
import { useSesion } from '../lib/Sesion'

export function Registro() {
  const { registrar } = useSesion()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mayor, setMayor] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await registrar(nombre, email, password)
      navegar('/cuenta')
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos crear la cuenta. Probá de nuevo.')
          : 'No pudimos conectarnos. Revisá que la API esté levantada.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MarcoAuth
      volanta="Crear cuenta"
      titulo="Empezá acá"
      bajada="Buscar restaurantes es gratis y no necesita cuenta. Registrate para guardar favoritos, reservar y dejar reseñas."
      pie={
        <>
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link>
        </>
      }
    >
      <form onSubmit={enviar}>
        <ErrorForm mensaje={error} />

        <Campo
          etiqueta="Nombre"
          autoComplete="name"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Cómo querés que te llamemos"
        />

        <Campo
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vos@ejemplo.com"
        />

        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          ayuda="Al menos 10 caracteres. La guardamos cifrada con bcrypt, nunca en texto legible."
        />

        {/* T&C art. 3: la plataforma no admite menores de 18 años. */}
        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={mayor}
            onChange={(e) => setMayor(e.target.checked)}
            className="mt-1 h-[17px] w-[17px] cursor-pointer accent-vino"
          />
          <span className="text-[13.5px] leading-snug text-tinta-2">
            Declaro que soy <strong className="font-semibold text-tinta">mayor de 18 años</strong>.
            La plataforma no admite cuentas de menores de edad.
          </span>
        </label>

        <button
          type="submit"
          className="boton boton-vino w-full"
          disabled={enviando || !mayor}
        >
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </button>

        <p className="mt-4 text-[12.5px] leading-snug text-tinta-3">
          Crear la cuenta te deja en el nivel de <strong>Usuario Registrado</strong>. Para reservar y
          reseñar hay un paso más: confirmar tu correo y tu teléfono, y aceptar los tres documentos
          del marco legal.
        </p>
      </form>
    </MarcoAuth>
  )
}
