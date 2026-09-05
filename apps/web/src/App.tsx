import { useEffect, useState } from 'react'
import { VERSION_LEGAL_VIGENTE } from '@restoba/shared'

type Salud = {
  ok: boolean
  servicio: string
  base: string
  postgres?: string | null
  postgis?: string | null
  detalle?: string
}

type Estado = { fase: 'cargando' } | { fase: 'listo'; salud: Salud } | { fase: 'error'; detalle: string }

/**
 * Pantalla de arranque del andamiaje.
 *
 * No es una pantalla del producto: sirve para confirmar de un vistazo que la
 * web levanta, que los tokens y las tipografías cargan, y que la API contesta
 * con PostGIS disponible. Se reemplaza por el buscador en la etapa A2.
 */
export function App() {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [tema, setTema] = useState<'claro' | 'oscuro' | null>(null)

  useEffect(() => {
    const controlador = new AbortController()

    fetch('/api/salud', { signal: controlador.signal })
      .then(async (r) => (await r.json()) as Salud)
      .then((salud) => setEstado({ fase: 'listo', salud }))
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setEstado({
          fase: 'error',
          detalle: error instanceof Error ? error.message : 'no se pudo contactar la API',
        })
      })

    return () => controlador.abort()
  }, [])

  function alternarTema() {
    const proximo = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(proximo)
    document.documentElement.dataset['theme'] = proximo === 'oscuro' ? 'dark' : 'light'
  }

  return (
    <div className="min-h-screen bg-papel">
      <header className="sticky top-0 z-10 border-b border-regla bg-papel/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-6 py-4">
          <b className="font-display text-[22px] font-semibold tracking-tight">RestoBA</b>
          <span className="volanta text-tinta-3">Andamiaje</span>
          <button
            type="button"
            onClick={alternarTema}
            className="ml-auto cursor-pointer rounded-boton border border-regla-2 bg-superficie px-4 py-2 text-sm font-semibold text-tinta-2 transition-colors hover:border-vino hover:text-vino"
          >
            {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="volanta mb-4 text-vino">Fase A · Fundaciones</p>
        <h1 className="mb-4 text-4xl leading-tight">El andamiaje está en pie</h1>
        <p className="mb-10 max-w-2xl font-display text-lg leading-relaxed text-tinta-2">
          Si estás leyendo esto con la tipografía Petrona sobre papel cálido, los tokens del sistema
          de diseño cargaron bien. Abajo, el estado real de la API y de PostGIS.
        </p>

        <section className="overflow-hidden rounded-panel border border-regla bg-superficie shadow-panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-regla bg-superficie-2 px-6 py-4">
            <b className="font-display text-lg font-semibold">Estado del sistema</b>
            <span className="ml-auto rounded-chip border border-regla-2 bg-superficie px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-tinta-2">
              MARCO LEGAL v{VERSION_LEGAL_VIGENTE}
            </span>
          </div>

          <dl className="divide-y divide-regla">
            <Fila etiqueta="Web (Vite + React)">
              <Valor tono="ok">funcionando</Valor>
            </Fila>

            {estado.fase === 'cargando' && (
              <Fila etiqueta="API">
                <Valor tono="neutro">consultando…</Valor>
              </Fila>
            )}

            {estado.fase === 'error' && (
              <Fila etiqueta="API">
                <Valor tono="alerta">sin respuesta</Valor>
                <p className="mt-1 text-sm text-tinta-3">
                  {estado.detalle}. Levantala con <code className="font-mono">npm run dev:api</code>.
                </p>
              </Fila>
            )}

            {estado.fase === 'listo' && (
              <>
                <Fila etiqueta="API">
                  <Valor tono={estado.salud.ok ? 'ok' : 'alerta'}>
                    {estado.salud.ok ? 'respondiendo' : 'con problemas'}
                  </Valor>
                </Fila>
                <Fila etiqueta="PostgreSQL">
                  {estado.salud.postgres ? (
                    <Valor tono="ok">{estado.salud.postgres}</Valor>
                  ) : (
                    <>
                      <Valor tono="alerta">sin conexión</Valor>
                      <p className="mt-1 text-sm text-tinta-3">
                        Levantá la base con <code className="font-mono">npm run db:up</code> y aplicá
                        las migraciones con <code className="font-mono">npm run db:migrate</code>.
                      </p>
                    </>
                  )}
                </Fila>
                <Fila etiqueta="PostGIS">
                  {estado.salud.postgis ? (
                    <Valor tono="ok">{estado.salud.postgis}</Valor>
                  ) : (
                    <Valor tono="alerta">no disponible</Valor>
                  )}
                </Fila>
              </>
            )}
          </dl>
        </section>

        <div className="mt-6 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-5 py-4">
          <p className="text-sm leading-relaxed text-tinta-2">
            <strong className="font-semibold text-tinta">Próximo paso: etapa A1.</strong> Registro e
            inicio de sesión, y la pantalla que exhibe los tres documentos legales completos con su
            hash SHA-256.
          </p>
        </div>
      </main>
    </div>
  )
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <dt className="volanta self-center text-tinta-3">{etiqueta}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}

function Valor({ tono, children }: { tono: 'ok' | 'alerta' | 'neutro'; children: React.ReactNode }) {
  const color =
    tono === 'ok' ? 'text-verde' : tono === 'alerta' ? 'text-vino' : 'text-tinta-3'
  return <span className={`font-mono text-sm font-medium ${color}`}>{children}</span>
}
