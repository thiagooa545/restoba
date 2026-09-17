/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La sesión del panel de gestión, separada de la del comensal.

   Es el mismo patrón que Sesion.tsx pero para el otro mundo: guarda qué
   empleado está logueado, de qué restaurante y con qué rol. Ese rol es
   lo que después decide qué pestañas se ven en el panel.

   El aislamiento multiempresa (RF-12) empieza acá y termina en el
   backend: el panel nunca manda el restaurante_id en las llamadas. El
   servidor lo saca del token. Si el panel lo mandara, alcanzaría con
   cambiar un número en el navegador para ver el stock de otro local.

   Responde a: RF-12 y Anexo Técnico de Seguridad, secc. 4.
   ════════════════════════════════════════════════════════════════════ */

import type { UsuarioStaff } from '@restoba/compartido'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './gestion'

type Estado = {
  usuario: UsuarioStaff | null
  cargando: boolean
  entrar: (email: string, password: string) => Promise<void>
  cerrar: () => Promise<void>
}

const Contexto = createContext<Estado | null>(null)

export function ProveedorGestion({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioStaff | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()

    api
      .renovarGestion(ctrl.signal)
      .then((r) => {
        api.guardarTokenGestion(r.accessToken)
        setUsuario(r.usuario)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })

    return () => ctrl.abort()
  }, [])

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api.ingresarGestion({ email, password })
    api.guardarTokenGestion(r.accessToken)
    setUsuario(r.usuario)
  }, [])

  const cerrar = useCallback(async () => {
    await api.salirGestion().catch(() => undefined)
    api.guardarTokenGestion(null)
    setUsuario(null)
  }, [])

  const valor = useMemo<Estado>(
    () => ({ usuario, cargando, entrar, cerrar }),
    [usuario, cargando, entrar, cerrar],
  )

  return <Contexto value={valor}>{children}</Contexto>
}

export function useGestion(): Estado {
  const valor = use(Contexto)
  if (!valor) throw new Error('useGestion tiene que usarse dentro de ProveedorGestion')
  return valor
}
