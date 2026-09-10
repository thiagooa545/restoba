import { useState } from 'react'
import { BotonSpecular } from '../componentes/BotonSpecular'
import { Link, useNavigate } from 'react-router'
import { ErrorApi } from '../lib/cliente'
import { Campo, ErrorForm, MarcoAuth } from '../componentes/MarcoAuth'
import { useSesion } from '../lib/Sesion'

export function Ingresar() {
  const { entrar } = useSesion()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await entrar(email, password)
      navegar('/cuenta')
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos iniciar sesión. Probá de nuevo.')
          : 'No pudimos conectarnos. Revisá que la API esté levantada.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MarcoAuth
      volanta="Iniciar sesión"
      titulo="Volviste"
      bajada="Entrá para reservar, dejar reseñas y ver tus puntos."
      pie={
        <>
          ¿Todavía no tenés cuenta? <Link to="/registro">Creá una</Link>
        </>
      }
    >
      <form onSubmit={enviar}>
        <ErrorForm mensaje={error} />

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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <BotonSpecular type="submit" className="mt-2 w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Ingresar'}
        </BotonSpecular>
      </form>
    </MarcoAuth>
  )
}
