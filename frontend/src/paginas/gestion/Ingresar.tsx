/* ════════════════════════════════════════════════════════════════════
   LA CARPETA  frontend/src/paginas/gestion/

   El panel del restaurante: la parte paga del sistema. Es la otra mitad
   de la aplicación, la que usan los empleados del local y no los
   comensales.

   Qué hay en cada archivo:

     Ingresar.tsx   ← este. La puerta del panel: login del personal.
     Panel.tsx      El marco: barra, pestañas según el rol y el candado.
     Inventario.tsx El depósito: ingredientes, stock y libro de movimientos.
     Recetas.tsx    Qué lleva cada plato de la carta.

   Por qué es una carpeta aparte y no más pantallas junto a las del
   comensal: son dos productos distintos sobre el mismo servidor. El
   comensal descubre restaurantes gratis; el restaurante paga por
   administrar el suyo. Separarlos en la estructura hace que el límite
   se vea, y evita que una pantalla del panel termine colgada del menú
   del comensal por descuido.

   ──────────────────────────────────────────────────────────────────────

   Este archivo en particular: el login del personal.

   Es un formulario casi igual al del comensal, pero pega en otra ruta
   de la API (/gestion/login) y deja la sesión en otra variable. Dos
   mundos que no se cruzan: el token del panel lleva marcado tipo
   'staff', y una ruta del comensal lo rechaza aunque la firma sea
   válida.

   Responde a: RF-01 y RF-08.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BotonSpecular } from '../../componentes/BotonSpecular'
import { Campo, ErrorForm, MarcoAuth } from '../../componentes/MarcoAuth'
import { ErrorApi } from '../../lib/cliente'
import { useGestion } from '../../lib/SesionGestion'

export function IngresarGestion() {
  const { entrar } = useGestion()
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
      navegar('/gestion/inventario')
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos iniciar sesión. Revisá el correo y la contraseña.')
          : 'No pudimos conectarnos. Revisá que la API esté levantada.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MarcoAuth
      volanta="Panel del restaurante"
      titulo="Gestión"
      bajada="Entrá con la cuenta que te dio la administración de tu local."
      pie={
        <>
          ¿Buscabas reservar una mesa? <Link to="/ingresar">Entrá como comensal</Link>
        </>
      }
    >
      <form onSubmit={enviar}>
        <ErrorForm mensaje={error} />

        <Campo
          etiqueta="Correo de trabajo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@tulocal.ar"
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
          {enviando ? 'Entrando…' : 'Entrar al panel'}
        </BotonSpecular>
      </form>

      {import.meta.env.DEV && (
        <p className="mt-6 border-t border-regla pt-4 font-mono text-[12px] leading-relaxed text-tinta-3">
          Cuentas de prueba: admin@cantina.ar · mozo@cantina.ar · cocina@cantina.ar
          <br />
          Contraseña: gestion2026
        </p>
      )}
    </MarcoAuth>
  )
}
