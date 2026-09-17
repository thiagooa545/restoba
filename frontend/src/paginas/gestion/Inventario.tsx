/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La pantalla del depósito. Es la respuesta a «¿quién carga el stock?»:
   lo carga el administrador del local, acá.

   Tres ideas para contar frente a la pantalla:

   1. El stock se lleva por ingrediente, no por plato. El local no tiene
      «doce milanesas»: tiene kilos de carne y de pan rallado. Por eso la
      tabla lista ingredientes con su unidad, y las recetas (la otra
      pestaña) son las que traducen un plato a ingredientes.

   2. Nunca se edita el número de stock a mano. Se registra qué pasó
      —una compra, una merma, un recuento— y el stock es la consecuencia.
      Eso deja el libro de movimientos de la derecha, que es lo que
      permite explicar por qué faltan tres kilos un martes. Editar el
      número directamente perdería esa información para siempre.

   3. El «ajuste» es un recuento físico: la cantidad que se escribe es lo
      que la persona contó en la heladera, no la diferencia. Que eso suba
      o baje el stock lo calcula el sistema. Es una decisión de diseño de
      la interfaz: quien cuenta no debería tener que hacer una resta.

   El stock mínimo es lo que enciende la alerta de arriba. No es cero,
   porque avisar cuando ya no queda nada llega tarde para reponer.

   Responde a: RF-08 (gestión de stock con alerta de mínimos).
   ════════════════════════════════════════════════════════════════════ */

import {
  formatearCantidad,
  formatearPrecio,
  NOMBRE_MOTIVO,
  UNIDADES,
  type Ingrediente,
  type MovimientoStock,
  type Unidad,
} from '@restoba/compartido'
import { useCallback, useEffect, useState } from 'react'
import { ErrorApi } from '../../lib/cliente'
import * as api from '../../lib/gestion'
import { useGestion } from '../../lib/SesionGestion'

type Motivo = 'compra' | 'ajuste' | 'merma'

const AYUDA_MOTIVO: Record<Motivo, string> = {
  compra: 'Entró mercadería. La cantidad se suma al depósito.',
  merma: 'Se rompió, se venció o se tiró. La cantidad se resta.',
  ajuste: 'Recuento físico: escribí lo que contaste. El sistema calcula la diferencia.',
}

export function Inventario() {
  const { usuario } = useGestion()
  const puedeEscribir = usuario?.suscripcion === 'activa'

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [bajoMinimo, setBajoMinimo] = useState(0)
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Qué panel está abierto a la derecha: el alta o el movimiento de un ingrediente. */
  const [panel, setPanel] = useState<{ modo: 'alta' } | { modo: 'movimiento'; id: number } | null>(null)

  const recargar = useCallback(async (senal?: AbortSignal) => {
    const [inv, movs] = await Promise.all([api.verInventario(senal), api.verMovimientos(senal)])
    setIngredientes(inv.ingredientes)
    setBajoMinimo(inv.bajoMinimo)
    setMovimientos(movs)
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    recargar(ctrl.signal)
      .catch(() => {
        if (!ctrl.signal.aborted) setError('No pudimos leer el depósito.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCargando(false)
      })
    return () => ctrl.abort()
  }, [recargar])

  const elegido = panel?.modo === 'movimiento' ? ingredientes.find((i) => i.id === panel.id) : undefined

  // El valor del depósito es un dato del negocio: qué plata hay inmovilizada.
  const valorTotal = ingredientes.reduce(
    (suma, i) => suma + (i.costoUnitario ?? 0) * i.stockActual,
    0,
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="volanta mb-1 text-vino">Depósito</p>
            <h1 className="text-[28px] leading-tight">Ingredientes y stock</h1>
          </div>

          <button
            type="button"
            onClick={() => setPanel({ modo: 'alta' })}
            className="boton boton-vino boton-chico"
            disabled={!puedeEscribir}
          >
            Cargar ingrediente
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <Dato titulo="Ingredientes" valor={String(ingredientes.length)} />
          <Dato
            titulo="Bajo el mínimo"
            valor={String(bajoMinimo)}
            alerta={bajoMinimo > 0}
          />
          <Dato titulo="Valor del depósito" valor={`$ ${formatearPrecio(Math.round(valorTotal))}`} />
        </div>

        {error && (
          <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] text-tinta-2">
            {error}
          </p>
        )}

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-regla bg-superficie-2 text-left">
                  <Th>Ingrediente</Th>
                  <Th derecha>Stock</Th>
                  <Th derecha>Mínimo</Th>
                  <Th derecha>Costo x unidad</Th>
                  <Th derecha>Recetas</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-mono text-[12.5px] text-tinta-3">
                      Leyendo el depósito…
                    </td>
                  </tr>
                )}

                {!cargando && ingredientes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13.5px] text-tinta-2">
                      El depósito está vacío. Empezá cargando un ingrediente.
                    </td>
                  </tr>
                )}

                {ingredientes.map((i) => (
                  <tr
                    key={i.id}
                    className={[
                      'border-b border-regla last:border-0',
                      elegido?.id === i.id ? 'bg-vino-suave' : 'hover:bg-superficie-2',
                    ].join(' ')}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-tinta">{i.nombre}</span>
                      {i.bajoMinimo && <span className="chip chip-ambar ml-2">reponer</span>}
                      {!i.activo && <span className="chip ml-2">inactivo</span>}
                    </td>
                    <td
                      className={[
                        'px-4 py-2.5 text-right font-mono whitespace-nowrap',
                        i.bajoMinimo ? 'font-semibold text-ambar' : 'text-tinta',
                      ].join(' ')}
                    >
                      {formatearCantidad(i.stockActual, i.unidad)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap text-tinta-3">
                      {formatearCantidad(i.stockMinimo, i.unidad)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap text-tinta-2">
                      {i.costoUnitario === null ? '—' : `$ ${formatearPrecio(i.costoUnitario)}`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-tinta-3">{i.enRecetas}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setPanel({ modo: 'movimiento', id: i.id })}
                        className="boton boton-fantasma boton-chico"
                        disabled={!puedeEscribir}
                      >
                        Movimiento
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Libro movimientos={movimientos} />
      </div>

      <aside className="lg:sticky lg:top-[132px] lg:self-start">
        {panel?.modo === 'alta' && (
          <FormaAlta
            onCerrar={() => setPanel(null)}
            onListo={async () => {
              setPanel(null)
              await recargar()
            }}
          />
        )}

        {elegido && (
          <FormaMovimiento
            ingrediente={elegido}
            onCerrar={() => setPanel(null)}
            onListo={async () => {
              await recargar()
            }}
          />
        )}

        {!panel && (
          <div className="panel px-5 py-5">
            <p className="volanta mb-2 text-tinta-3">Cómo se mueve el stock</p>
            <p className="mb-3 text-[13.5px] leading-relaxed text-tinta-2">
              El número de stock no se edita a mano: se registra qué pasó y el sistema recalcula el
              saldo.
            </p>
            <ul className="space-y-2 text-[13px] leading-snug text-tinta-2">
              {(['compra', 'merma', 'ajuste'] as Motivo[]).map((m) => (
                <li key={m}>
                  <span className="chip mb-1">{NOMBRE_MOTIVO[m]}</span>
                  <br />
                  {AYUDA_MOTIVO[m]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}

// ── Piezas de la pantalla ───────────────────────────────────

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

function Th({ children, derecha }: { children?: React.ReactNode; derecha?: boolean }) {
  return (
    <th
      className={[
        'volanta px-4 py-2.5 font-bold text-tinta-3',
        derecha ? 'text-right' : 'text-left',
      ].join(' ')}
    >
      {children}
    </th>
  )
}

function Libro({ movimientos }: { movimientos: MovimientoStock[] }) {
  if (movimientos.length === 0) return null

  return (
    <section className="mt-7">
      <h2 className="mb-1 text-[19px] leading-tight">Libro de movimientos</h2>
      <p className="mb-3 text-[13.5px] leading-snug text-tinta-2">
        Cada cambio de stock queda registrado con su motivo y quién lo hizo. Es lo que permite
        distinguir una venta de una pérdida.
      </p>

      <div className="panel divide-y divide-regla">
        {movimientos.slice(0, 14).map((m) => (
          <div key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="font-mono text-[11.5px] whitespace-nowrap text-tinta-3">
              {new Date(m.creadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
            </span>

            <span
              className={
                m.motivo === 'compra' || m.motivo === 'inicial'
                  ? 'chip chip-verde'
                  : m.motivo === 'merma'
                    ? 'chip chip-vino'
                    : 'chip'
              }
            >
              {NOMBRE_MOTIVO[m.motivo]}
            </span>

            <span className="text-[13.5px] font-medium text-tinta">{m.ingrediente}</span>

            <span
              className={[
                'font-mono text-[13px] whitespace-nowrap',
                m.cantidad > 0 ? 'text-verde' : 'text-vino',
              ].join(' ')}
            >
              {m.cantidad > 0 ? '+' : ''}
              {formatearCantidad(m.cantidad, m.unidad)}
            </span>

            <span className="font-mono text-[12px] whitespace-nowrap text-tinta-3">
              saldo {formatearCantidad(m.saldo, m.unidad)}
            </span>

            {m.nota && (
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-tinta-3">{m.nota}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function FormaAlta({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState<Unidad>('kg')
  const [stockInicial, setStockInicial] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [costo, setCosto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await api.crearIngrediente({
        nombre,
        unidad,
        stockInicial: Number(stockInicial || 0),
        stockMinimo: Number(stockMinimo || 0),
        ...(costo === '' ? {} : { costoUnitario: Number(costo) }),
      })
      await onListo()
    } catch (e) {
      setError(e instanceof ErrorApi ? (e.detalle ?? 'No pudimos guardarlo.') : 'No pudimos guardarlo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="panel px-5 py-5">
      <Cabecera titulo="Cargar ingrediente" onCerrar={onCerrar} />

      <CampoPanel
        etiqueta="Nombre"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Carne picada"
      />

      <label className="mb-3.5 block">
        <span className="volanta mb-1.5 block text-tinta-3">Unidad</span>
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value as Unidad)}
          className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3 py-2 text-[14px] text-tinta outline-none focus:border-vino"
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-[12px] leading-snug text-tinta-3">
          La unidad no se puede cambiar después: las recetas dependen de ella.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <CampoPanel
          etiqueta="Stock de hoy"
          type="number"
          step="0.001"
          min="0"
          value={stockInicial}
          onChange={(e) => setStockInicial(e.target.value)}
          placeholder="0"
        />
        <CampoPanel
          etiqueta="Mínimo"
          type="number"
          step="0.001"
          min="0"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          placeholder="0"
        />
      </div>

      <CampoPanel
        etiqueta="Costo por unidad"
        type="number"
        step="0.01"
        min="0"
        value={costo}
        onChange={(e) => setCosto(e.target.value)}
        placeholder="Opcional"
      />

      <Aviso mensaje={error} />

      <button type="submit" className="boton boton-vino w-full" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}

function FormaMovimiento({
  ingrediente,
  onCerrar,
  onListo,
}: {
  ingrediente: Ingrediente
  onCerrar: () => void
  onListo: () => Promise<void>
}) {
  const [motivo, setMotivo] = useState<Motivo>('compra')
  const [cantidad, setCantidad] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setListo(null)
    setEnviando(true)

    try {
      const { ingrediente: nuevo } = await api.registrarMovimiento(ingrediente.id, {
        cantidad: Number(cantidad || 0),
        motivo,
        ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
      })
      setCantidad('')
      setNota('')
      setListo(`Quedan ${formatearCantidad(nuevo.stockActual, nuevo.unidad)}.`)
      await onListo()
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos registrar el movimiento.')
          : 'No pudimos registrar el movimiento.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="panel px-5 py-5">
      <Cabecera titulo={ingrediente.nombre} onCerrar={onCerrar} />

      <p className="mb-4 font-mono text-[13px] text-tinta-2">
        Hoy hay{' '}
        <span className="font-semibold text-tinta">
          {formatearCantidad(ingrediente.stockActual, ingrediente.unidad)}
        </span>
        {ingrediente.bajoMinimo && <span className="chip chip-ambar ml-2">bajo el mínimo</span>}
      </p>

      <div className="mb-1.5 flex gap-1.5">
        {(['compra', 'merma', 'ajuste'] as Motivo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            className={['pastilla flex-1 justify-center', motivo === m ? 'pastilla-activa' : ''].join(' ')}
          >
            {m === 'compra' ? 'Compra' : m === 'merma' ? 'Merma' : 'Recuento'}
          </button>
        ))}
      </div>

      <p className="mb-4 text-[12.5px] leading-snug text-tinta-3">{AYUDA_MOTIVO[motivo]}</p>

      <CampoPanel
        etiqueta={motivo === 'ajuste' ? `Contaste (${ingrediente.unidad})` : `Cantidad (${ingrediente.unidad})`}
        type="number"
        step="0.001"
        min="0"
        required
        autoFocus
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <CampoPanel
        etiqueta="Nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder={motivo === 'compra' ? 'Proveedor, remito…' : 'Qué pasó'}
      />

      <Aviso mensaje={error} />
      {listo && (
        <p className="mb-3 rounded-r-[10px] border-l-[3px] border-verde bg-verde-suave px-3.5 py-2.5 text-[13px] text-verde">
          Registrado. {listo}
        </p>
      )}

      <button type="submit" className="boton boton-vino w-full" disabled={enviando}>
        {enviando ? 'Registrando…' : 'Registrar movimiento'}
      </button>
    </form>
  )
}

function Cabecera({ titulo, onCerrar }: { titulo: string; onCerrar: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h2 className="text-[19px] leading-tight">{titulo}</h2>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="-mt-1 -mr-1 px-2 py-1 text-[18px] leading-none text-tinta-3 hover:text-tinta"
      >
        ×
      </button>
    </div>
  )
}

function CampoPanel({
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

function Aviso({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p className="mb-3 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-3.5 py-2.5 text-[13px] leading-snug text-tinta-2">
      {mensaje}
    </p>
  )
}
