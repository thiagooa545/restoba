/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La pantalla donde el restaurante carga y edita su menú.

   Es la respuesta a la otra pregunta de la defensa: dónde sube el local
   su carta, y cómo se actualiza eso en la página pública.

   La respuesta es que no hay que actualizar nada. Esta pantalla escribe
   en las tablas `categoria` y `producto`, que son exactamente las mismas
   que lee el perfil público del restaurante. No existe un botón de
   «publicar» ni una copia de la carta para mostrar: hay una sola carta,
   y el panel y la web son dos ventanas a la misma.

   Eso se puede mostrar en vivo: se cambia un precio acá, se recarga la
   página del restaurante en otra pestaña, y el precio ya está. Si
   hubiera dos copias habría que sincronizarlas, y toda sincronización
   falla alguna vez y deja un precio viejo a la vista.

   El link «Ver en la web» de arriba abre justamente esa otra ventana.

   Además cada plato muestra dos datos que vienen del depósito: cuántos
   ingredientes tiene su receta, y si hoy está agotado. Un plato agotado
   sigue en la carta pero el comensal lo ve marcado, sin que nadie tenga
   que acordarse de esconderlo.

   Responde a: RF-08 (gestión de la carta) y RF-12.
   ════════════════════════════════════════════════════════════════════ */

import {
  formatearPrecio,
  type CategoriaGestion,
  type ProductoGestion,
} from '@restoba/compartido'
import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../../lib/cliente'
import * as api from '../../lib/gestion'
import { useGestion } from '../../lib/SesionGestion'

export function Carta() {
  const { usuario } = useGestion()
  const puedeEscribir = usuario?.suscripcion === 'activa'

  const [carta, setCarta] = useState<CategoriaGestion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevaSeccion, setNuevaSeccion] = useState('')

  /** Qué está abierto a la derecha: un plato existente o uno nuevo en tal sección. */
  const [edicion, setEdicion] = useState<
    { modo: 'editar'; plato: ProductoGestion } | { modo: 'nuevo'; categoriaId: number } | null
  >(null)

  const recargar = useCallback(async (senal?: AbortSignal) => {
    setCarta(await api.verCarta(senal))
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    recargar(ctrl.signal)
      .catch(() => {
        if (!ctrl.signal.aborted) setError('No pudimos leer la carta.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })
    return () => ctrl.abort()
  }, [recargar])

  async function agregarSeccion(e: React.FormEvent) {
    e.preventDefault()
    if (nuevaSeccion.trim().length < 2) return
    setError(null)
    try {
      await api.crearSeccion(nuevaSeccion.trim())
      setNuevaSeccion('')
      await recargar()
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos crear la sección.') : 'No pudimos crear la sección.')
    }
  }

  async function quitarSeccion(id: number, nombre: string) {
    if (!confirm(`¿Borrar la sección «${nombre}»?`)) return
    setError(null)
    try {
      await api.borrarSeccion(id)
      await recargar()
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos borrar la sección.') : 'No pudimos borrar la sección.')
    }
  }

  const platos = carta.reduce((n, c) => n + c.productos.length, 0)
  const agotados = carta.reduce((n, c) => n + c.productos.filter((p) => p.sinStock).length, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="volanta mb-1 text-vino">Carta</p>
            <h1 className="text-[28px] leading-tight">Tu menú</h1>
          </div>

          {/* La misma carta, vista como la ve el comensal. Es la prueba de que
              no hay dos copias: se abre al lado y se compara. */}
          <a
            href={`/restaurante/${usuario?.restauranteId}/carta`}
            target="_blank"
            rel="noreferrer"
            className="boton boton-fantasma boton-chico no-underline"
          >
            Ver en la web ↗
          </a>
        </div>

        <p className="mb-5 max-w-[62ch] text-[14px] leading-relaxed text-tinta-2">
          Lo que cargues acá es lo que ve el comensal en tu perfil. No hay que publicar nada: es la
          misma carta.
        </p>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <Dato titulo="Secciones" valor={String(carta.length)} />
          <Dato titulo="Platos" valor={String(platos)} />
          <Dato titulo="Agotados hoy" valor={String(agotados)} alerta={agotados > 0} />
        </div>

        {error && (
          <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] leading-snug text-tinta-2">
            {error}
          </p>
        )}

        {cargando && <p className="font-mono text-[13px] text-tinta-3">Leyendo la carta…</p>}

        {carta.map((c) => (
          <section key={c.id} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <p className="volanta flex-1 text-tinta-3">{c.nombre}</p>
              {puedeEscribir && (
                <>
                  <button
                    type="button"
                    onClick={() => setEdicion({ modo: 'nuevo', categoriaId: c.id })}
                    className="boton boton-fantasma boton-chico"
                  >
                    + Plato
                  </button>
                  {c.productos.length === 0 && (
                    <button
                      type="button"
                      onClick={() => void quitarSeccion(c.id, c.nombre)}
                      className="boton boton-fantasma boton-chico"
                    >
                      Borrar
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="panel divide-y divide-regla">
              {c.productos.length === 0 && (
                <p className="px-4 py-5 text-center text-[13.5px] text-tinta-3">
                  Esta sección todavía no tiene platos.
                </p>
              )}

              {c.productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setEdicion({ modo: 'editar', plato: p })}
                  className={[
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    edicion?.modo === 'editar' && edicion.plato.id === p.id
                      ? 'bg-vino-suave'
                      : 'hover:bg-superficie-2',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={[
                          'text-[14.5px] font-medium',
                          p.activo ? 'text-tinta' : 'text-tinta-3 line-through',
                        ].join(' ')}
                      >
                        {p.nombre}
                      </span>
                      {p.destacado && <span className="chip chip-vino">destacado</span>}
                      {p.sinStock && <span className="chip chip-ambar">agotado</span>}
                      {!p.activo && <span className="chip">oculto</span>}
                    </span>

                    {p.descripcion && (
                      <span className="mt-0.5 block truncate text-[12.5px] text-tinta-3">
                        {p.descripcion}
                      </span>
                    )}

                    <span className="mt-0.5 block font-mono text-[11.5px] text-tinta-3">
                      {p.enRecetas === 0
                        ? 'sin receta cargada'
                        : `${p.enRecetas} ${p.enRecetas === 1 ? 'ingrediente' : 'ingredientes'}`}
                      {p.vegetariano && ' · vegetariano'}
                      {p.sinTacc && ' · sin TACC'}
                    </span>
                  </span>

                  <span className="font-mono text-[14px] whitespace-nowrap text-tinta">
                    $ {formatearPrecio(p.precio)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {puedeEscribir && (
          <form onSubmit={agregarSeccion} className="flex gap-2">
            <input
              value={nuevaSeccion}
              onChange={(e) => setNuevaSeccion(e.target.value)}
              placeholder="Nueva sección: Desayunos, Postres…"
              className="flex-1 rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] text-tinta outline-none placeholder:text-tinta-3 focus:border-vino"
            />
            <button type="submit" className="boton boton-fantasma">
              Agregar sección
            </button>
          </form>
        )}
      </div>

      <aside className="lg:sticky lg:top-[132px] lg:self-start">
        {edicion ? (
          <EditorPlato
            key={edicion.modo === 'editar' ? edicion.plato.id : `nuevo-${edicion.categoriaId}`}
            edicion={edicion}
            secciones={carta}
            onCerrar={() => setEdicion(null)}
            onListo={async () => {
              setEdicion(null)
              await recargar()
            }}
          />
        ) : (
          <div className="panel px-5 py-5">
            <p className="volanta mb-2 text-tinta-3">Cómo llega a la web</p>
            <p className="mb-3 text-[13.5px] leading-relaxed text-tinta-2">
              El panel y el perfil público leen la misma tabla. Cambiás un precio acá y el comensal
              lo ve al recargar: no hay copia intermedia que pueda quedar vieja.
            </p>
            <p className="text-[13.5px] leading-relaxed text-tinta-2">
              Un plato <strong className="font-semibold">oculto</strong> desaparece de la carta
              pública. Uno <strong className="font-semibold">agotado</strong> sigue visible pero
              marcado, y eso lo decide el stock del depósito, no vos.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

function Dato({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className={['panel px-4 py-3', alerta ? 'border-ambar/40 bg-ambar-suave' : ''].join(' ')}>
      <p className="volanta mb-1 text-tinta-3">{titulo}</p>
      <p
        className={[
          'font-mono text-[21px] leading-none font-semibold',
          alerta ? 'text-ambar' : 'text-tinta',
        ].join(' ')}
      >
        {valor}
      </p>
    </div>
  )
}

function EditorPlato({
  edicion,
  secciones,
  onCerrar,
  onListo,
}: {
  edicion: { modo: 'editar'; plato: ProductoGestion } | { modo: 'nuevo'; categoriaId: number }
  secciones: CategoriaGestion[]
  onCerrar: () => void
  onListo: () => Promise<void>
}) {
  const plato = edicion.modo === 'editar' ? edicion.plato : null

  const [nombre, setNombre] = useState(plato?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(plato?.descripcion ?? '')
  const [precio, setPrecio] = useState(plato ? String(plato.precio) : '')
  const [categoriaId, setCategoriaId] = useState(
    edicion.modo === 'editar' ? edicion.plato.categoriaId : edicion.categoriaId,
  )
  const [activo, setActivo] = useState(plato?.activo ?? true)
  const [vegetariano, setVegetariano] = useState(plato?.vegetariano ?? false)
  const [sinTacc, setSinTacc] = useState(plato?.sinTacc ?? false)
  const [destacado, setDestacado] = useState(plato?.destacado ?? false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    const datos = {
      categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
      precio: Number(precio || 0),
      activo,
      vegetariano,
      sinTacc,
      destacado,
    }

    try {
      if (plato) await api.editarPlato(plato.id, datos)
      else await api.crearPlato(datos)
      await onListo()
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos guardarlo.') : 'No pudimos guardarlo.')
      setEnviando(false)
    }
  }

  async function borrar() {
    if (!plato || !confirm(`¿Borrar «${plato.nombre}» de la carta?`)) return
    setEnviando(true)
    try {
      await api.borrarPlato(plato.id)
      await onListo()
    } catch {
      setError('No pudimos borrarlo.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="panel px-5 py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[19px] leading-tight">{plato ? plato.nombre : 'Plato nuevo'}</h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="-mt-1 -mr-1 px-2 py-1 text-[18px] leading-none text-tinta-3 hover:text-tinta"
        >
          ×
        </button>
      </div>

      <Campo etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label className="mb-3.5 block">
        <span className="volanta mb-1.5 block text-tinta-3">Descripción</span>
        <textarea
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Cómo viene el plato, qué lleva…"
          className="w-full resize-y rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] leading-snug text-tinta outline-none placeholder:text-tinta-3 focus:border-vino"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Precio"
          type="number"
          step="1"
          min="0"
          required
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />

        <label className="mb-3.5 block">
          <span className="volanta mb-1.5 block text-tinta-3">Sección</span>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(Number(e.target.value))}
            className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] text-tinta outline-none focus:border-vino"
          >
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 space-y-2">
        <Casilla marcada={activo} alCambiar={setActivo} etiqueta="Visible en la carta pública" />
        <Casilla marcada={destacado} alCambiar={setDestacado} etiqueta="Destacado" />
        <Casilla marcada={vegetariano} alCambiar={setVegetariano} etiqueta="Vegetariano" />
        <Casilla marcada={sinTacc} alCambiar={setSinTacc} etiqueta="Sin TACC" />
      </div>

      {plato?.sinStock && (
        <p className="mb-3 rounded-r-[10px] border-l-[3px] border-ambar bg-ambar-suave px-3.5 py-2.5 text-[12.5px] leading-snug text-ambar">
          Hoy figura agotado: a algún ingrediente de su receta no le alcanza para una porción. Se
          arregla reponiendo en el depósito, no desde acá.
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-3.5 py-2.5 text-[13px] leading-snug text-tinta-2">
          {error}
        </p>
      )}

      <button type="submit" className="boton boton-vino w-full" disabled={enviando}>
        {enviando ? 'Guardando…' : plato ? 'Guardar cambios' : 'Agregar a la carta'}
      </button>

      {plato && (
        <button
          type="button"
          onClick={() => void borrar()}
          disabled={enviando}
          className="mt-2 w-full px-3 py-2 text-[13px] text-tinta-3 hover:text-vino"
        >
          Borrar de la carta
        </button>
      )}
    </form>
  )
}

function Campo({
  etiqueta,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="mb-3.5 block">
      <span className="volanta mb-1.5 block text-tinta-3">{etiqueta}</span>
      <input
        {...props}
        className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] text-tinta outline-none transition-colors placeholder:text-tinta-3 focus:border-vino"
      />
    </label>
  )
}

function Casilla({
  marcada,
  alCambiar,
  etiqueta,
}: {
  marcada: boolean
  alCambiar: (v: boolean) => void
  etiqueta: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-tinta-2">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => alCambiar(e.target.checked)}
        className="size-4 accent-[var(--rb-vino)]"
      />
      {etiqueta}
    </label>
  )
}
