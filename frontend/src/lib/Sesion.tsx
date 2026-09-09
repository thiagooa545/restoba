import type { ComensalPublico } from '@restoba/compartido'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './cliente'

type Estado = {
  comensal: ComensalPublico | null
  cargando: boolean
  entrar: (email: string, password: string) => Promise<void>
  registrar: (nombre: string, email: string, password: string) => Promise<string | undefined>
  cerrar: () => Promise<void>
  actualizar: (comensal: ComensalPublico) => void
}

const Contexto = createContext<Estado | null>(null)

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [comensal, setComensal] = useState<ComensalPublico | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al cargar la página se intenta recuperar la sesión con la cookie httpOnly.
  // Si no hay cookie o venció, sigue como visitante y listo.
  useEffect(() => {
    const ctrl = new AbortController()

    api
      .renovarSesion(ctrl.signal)
      .then((r) => {
        api.guardarToken(r.accessToken)
        setComensal(r.comensal)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })

    return () => ctrl.abort()
  }, [])

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api.ingresar({ email, password })
    api.guardarToken(r.accessToken)
    setComensal(r.comensal)
  }, [])

  const registrar = useCallback(async (nombre: string, email: string, password: string) => {
    const r = await api.registrarse({ nombre, email, password, mayorDeEdad: true })
    api.guardarToken(r.accessToken)
    setComensal(r.comensal)
    return r.codigoDemo
  }, [])

  const cerrar = useCallback(async () => {
    await api.salir().catch(() => undefined)
    api.guardarToken(null)
    setComensal(null)
  }, [])

  const valor = useMemo<Estado>(
    () => ({ comensal, cargando, entrar, registrar, cerrar, actualizar: setComensal }),
    [comensal, cargando, entrar, registrar, cerrar],
  )

  return <Contexto value={valor}>{children}</Contexto>
}

export function useSesion(): Estado {
  const valor = use(Contexto)
  if (!valor) throw new Error('useSesion tiene que usarse dentro de ProveedorSesion')
  return valor
}
