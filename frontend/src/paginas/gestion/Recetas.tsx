/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Las recetas: qué lleva cada plato de la carta.

   Por qué esta pantalla existe y no alcanza con el depósito: el stock se
   lleva por ingrediente, pero el comensal pide platos. La receta es la
   traducción entre las dos cosas. Sin ella, cuando alguien pide una
   milanesa el sistema no tiene forma de saber cuánta carne descontar.

   Eso es exactamente lo que va a usar la etapa siguiente, la de pedidos:
   al confirmar un pedido se lee la receta de cada plato y se descuenta.
   Acá se cargan los datos que esa automatización necesita.

   «Porciones posibles» es el dato que sale de cruzar las dos tablas: de
   todos los ingredientes de la receta, el que primero se termina marca
   cuántos platos se pueden hacer hoy. No es un campo guardado, se calcula
   en el momento: si fuera un campo, quedaría desactualizado con cada
   compra.

   Un plato puede no tener receta, y está bien: las bebidas no se preparan
   con ingredientes del depósito. La tabla los muestra como «sin receta»
   en vez de esconderlos, para que el administrador vea qué le falta cargar.

   Responde a: RF-08 y el DER (relación N:M producto–ingrediente).
   ════════════════════════════════════════════════════════════════════ */

import {
  formatearCantidad,
  type Ingrediente,
  type RecetaProducto,
} from '@restoba/compartido'
import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../../lib/cliente'
import * as api from '../../lib/gestion'
import { useGestion } from '../../lib/SesionGestion'

export function Recetas() {
  const { usuario } = useGestion()
  const puedeEscribir = usuario?.suscripcion === 'activa'

  const [platos, setPlatos] = useState<api.PlatoConReceta[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [receta, setReceta] = useState<RecetaProducto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([api.verPlatos(ctrl.signal), api.verInventario(ctrl.signal)])
      .then(([p, inv]) => {
        setPlatos(p)
        setIngredientes(inv.ingredientes)
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError('No pudimos leer la carta.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })
    return () => ctrl.abort()
  }, [])

  const abrir = useCallback(async (id: number) => {
    setError(null)
    try {
      setReceta(await api.verReceta(id))
    } catch {
      setError('No pudimos abrir esa receta.')
    }
  }, [])

  const porCategoria = platos.reduce<Record<string, api.PlatoConReceta[]>>((acc, p) => {
    ;(acc[p.categoria] ??= []).push(p)
    return acc
  }, {})

  const conReceta = platos.filter((p) => p.ingredientes > 0).length

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <p className="volanta mb-1 text-vino">Carta</p>
        <h1 className="mb-1 text-[28px] leading-tight">Recetas</h1>
        <p className="mb-2 max-w-[62ch] text-[14px] leading-relaxed text-tinta-2">
          Cuánto consume cada plato del depósito. Es lo que permite que el stock se descuente solo
          cuando se confirma un pedido.
        </p>
        <p className="mb-5 font-mono text-[12.5px] text-tinta-3">
          {conReceta} de {platos.length} platos ya tienen receta
        </p>

        {error && (
          <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] text-tinta-2">
            {error}
          </p>
        )}

        {cargando && <p className="font-mono text-[13px] text-tinta-3">Leyendo la carta…</p>}

        {Object.entries(porCategoria).map(([categoria, items]) => (
          <section key={categoria} className="mb-5">
            <p className="volanta mb-2 text-tinta-3">{categoria}</p>
            <div className="panel divide-y divide-regla">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void abrir(p.id)}
                  className={[
                    'flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors',
                    receta?.productoId === p.id ? 'bg-vino-suave' : 'hover:bg-superficie-2',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-tinta">
                    {p.nombre}
                  </span>
                  {p.ingredientes === 0 ? (
                    <span className="chip">sin receta</span>
                  ) : (
                    <span className="chip chip-verde">
                      {p.ingredientes} {p.ingredientes === 1 ? 'ingrediente' : 'ingredientes'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-[132px] lg:self-start">
        {receta ? (
          <EditorReceta
            receta={receta}
            ingredientes={ingredientes}
            puedeEscribir={puedeEscribir}
            onCerrar={() => setReceta(null)}
            onGuardada={(guardada) => {
              setReceta(guardada)
              setPlatos((antes) =>
                antes.map((p) =>
                  p.id === guardada.productoId ? { ...p, ingredientes: guardada.items.length } : p,
                ),
              )
            }}
          />
        ) : (
          <div className="panel px-5 py-5">
            <p className="volanta mb-2 text-tinta-3">Cómo se lee</p>
            <p className="text-[13.5px] leading-relaxed text-tinta-2">
              Elegí un plato de la izquierda para ver o cargar su receta. El panel muestra cuántas
              porciones se pueden preparar con el stock de hoy: el ingrediente que primero se termina
              es el que pone el límite.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

function EditorReceta({
  receta,
  ingredientes,
  puedeEscribir,
  onCerrar,
  onGuardada,
}: {
  receta: RecetaProducto
  ingredientes: Ingrediente[]
  puedeEscribir: boolean
  onCerrar: () => void
  onGuardada: (receta: RecetaProducto) => void
}) {
  const [items, setItems] = useState<{ ingredienteId: number; cantidad: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Cada vez que cambia el plato elegido, el formulario se rearma con su receta.
  useEffect(() => {
    setItems(receta.items.map((i) => ({ ingredienteId: i.ingredienteId, cantidad: String(i.cantidad) })))
    setError(null)
  }, [receta])

  const disponibles = ingredientes.filter(
    (i) => i.activo && !items.some((it) => it.ingredienteId === i.id),
  )

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      const guardada = await api.guardarReceta(
        receta.productoId,
        items
          .filter((i) => Number(i.cantidad) > 0)
          .map((i) => ({ ingredienteId: i.ingredienteId, cantidad: Number(i.cantidad) })),
      )
      onGuardada(guardada)
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos guardar la receta.') : 'No pudimos guardar la receta.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="panel px-5 py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] leading-tight">{receta.producto}</h2>
          <p className="font-mono text-[12px] text-tinta-3">
            {receta.porcionesPosibles === null
              ? 'sin receta cargada'
              : `${receta.porcionesPosibles} porciones con el stock de hoy`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="-mt-1 -mr-1 px-2 py-1 text-[18px] leading-none text-tinta-3 hover:text-tinta"
        >
          ×
        </button>
      </div>

      {items.length === 0 && (
        <p className="mb-4 text-[13.5px] leading-snug text-tinta-2">
          Este plato todavía no tiene receta. Agregá los ingredientes que consume.
        </p>
      )}

      <div className="mb-4 space-y-2">
        {items.map((it, indice) => {
          const ing = ingredientes.find((i) => i.id === it.ingredienteId)
          const alcanza =
            ing && Number(it.cantidad) > 0 ? Math.floor(ing.stockActual / Number(it.cantidad)) : null

          return (
            <div key={it.ingredienteId} className="border-b border-regla pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-tinta">
                  {ing?.nombre ?? `Ingrediente ${it.ingredienteId}`}
                </span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={it.cantidad}
                  disabled={!puedeEscribir}
                  onChange={(e) =>
                    setItems((antes) =>
                      antes.map((x, i) => (i === indice ? { ...x, cantidad: e.target.value } : x)),
                    )
                  }
                  className="w-20 rounded-[8px] border border-regla-2 bg-superficie px-2 py-1 text-right font-mono text-[13px] text-tinta outline-none focus:border-vino"
                />
                <span className="w-12 font-mono text-[12px] text-tinta-3">{ing?.unidad}</span>
                <button
                  type="button"
                  aria-label="Quitar"
                  disabled={!puedeEscribir}
                  onClick={() => setItems((antes) => antes.filter((_, i) => i !== indice))}
                  className="px-1 text-[16px] leading-none text-tinta-3 hover:text-vino disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              {ing && (
                <p className="mt-0.5 font-mono text-[11.5px] text-tinta-3">
                  hay {formatearCantidad(ing.stockActual, ing.unidad)}
                  {alcanza !== null && ` · alcanza para ${alcanza}`}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {puedeEscribir && disponibles.length > 0 && (
        <label className="mb-4 block">
          <span className="volanta mb-1.5 block text-tinta-3">Agregar ingrediente</span>
          <select
            value=""
            onChange={(e) => {
              const id = Number(e.target.value)
              if (id) setItems((antes) => [...antes, { ingredienteId: id, cantidad: '' }])
            }}
            className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] text-tinta outline-none focus:border-vino"
          >
            <option value="">Elegí uno…</option>
            {disponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} ({i.unidad})
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p className="mb-3 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-3.5 py-2.5 text-[13px] leading-snug text-tinta-2">
          {error}
        </p>
      )}

      {puedeEscribir && (
        <button
          type="button"
          onClick={() => void guardar()}
          className="boton boton-vino w-full"
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar receta'}
        </button>
      )}
    </div>
  )
}
