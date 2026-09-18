/* ════════════════════════════════════════════════════════════════════
   LA CARPETA  frontend/src/paginas/

   Una pantalla por cada dirección del navegador. Son las siete del lado del
   comensal.

   Ninguna de estas pantallas calcula nada importante: le piden los datos ya
   resueltos a la API y se ocupan de mostrarlos. Esa es la separación de capas en
   la práctica.

   Qué hay en cada archivo:

     Carta.tsx      ← este. La carta del restaurante con fotos.
     Inicio.tsx     La portada con el buscador.
     Resultados.tsx La lista y el mapa, sincronizados.
     Perfil.tsx     El perfil del restaurante con horarios y reseñas.
     Registro.tsx   Crear cuenta.
     Ingresar.tsx   Iniciar sesión.
     Cuenta.tsx     Verificación, reservas, puntos y favoritos.

   ──────────────────────────────────────────────────────────────────────

   Este archivo en particular: la carta.

   Las categorías no están escritas acá: salen de la base, así que cada local
   muestra las suyas. Un bodegón tiene Entradas, Principales y Postres; un café
   tiene Desayunos, Cafetería y Bebidas.

   Un plato que el local marcó sin stock se muestra atenuado en vez de
   desaparecer, para que el comensal sepa que existe pero hoy no está.

   Responde a: RF-05.
   ════════════════════════════════════════════════════════════════════ */

import { formatearPrecio, type CategoriaCarta, type RestauranteDetalle } from '@restoba/compartido'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BotonSpecular } from '../componentes/BotonSpecular'
import { Encabezado } from '../componentes/Encabezado'
import { Foto } from '../componentes/Foto'
import { Aviso, Estrella, Hoja, Volver } from '../componentes/Iconos'
import { verRestaurante } from '../lib/cliente'

export function Carta() {
  const { id } = useParams()
  const [resto, setResto] = useState<RestauranteDetalle | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [categoria, setCategoria] = useState<number | 'todo'>('todo')

  useEffect(() => {
    const ctrl = new AbortController()
    const numero = Number(id)

    if (!Number.isInteger(numero) || numero <= 0) {
      setEstado('error')
      return
    }

    verRestaurante(numero, undefined, ctrl.signal)
      .then((r) => {
        setResto(r)
        setEstado('listo')
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setEstado('error')
      })

    return () => ctrl.abort()
  }, [id])

  const platos = useMemo(() => resto?.carta.flatMap((c) => c.productos) ?? [], [resto])
  const destacado = platos.find((p) => p.destacado && p.activo && !p.sinStock) ?? null

  if (estado === 'cargando') {
    return (
      <Marco id={id}>
        <p className="py-24 text-center text-tinta-3">Cargando la carta…</p>
      </Marco>
    )
  }

  if (estado === 'error' || !resto) {
    return (
      <Marco id={id}>
        <div className="panel mx-auto my-24 max-w-lg px-8 py-10 text-center">
          <h1 className="mb-2 text-2xl">No encontramos esa carta</h1>
          <Link to="/buscar" className="boton boton-vino no-underline">
            Volver al buscador
          </Link>
        </div>
      </Marco>
    )
  }

  const visibles =
    categoria === 'todo' ? resto.carta : resto.carta.filter((c) => c.id === categoria)

  return (
    <Marco id={id} nombre={resto.nombre}>
      {/* Portada de la carta */}
      <div className="relative overflow-hidden border-b border-regla bg-superficie-2">
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage: 'radial-gradient(var(--rb-regla-2) 1.1px, transparent 1.1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mx-auto max-w-[1100px] px-4 py-10 sm:px-8">
          <p className="volanta mb-2.5 text-vino">La carta de</p>
          <h1 className="mb-3.5 text-[clamp(2rem,5vw,2.9rem)] leading-[1.05] tracking-[-0.028em]">
            {resto.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {resto.cocinas.map((c) => (
              <span key={c.slug} className="chip">
                {c.nombre.toUpperCase()}
              </span>
            ))}
            {resto.abierto !== null && (
              <span className={resto.abierto ? 'chip chip-verde' : 'chip'}>
                {resto.abierto
                  ? resto.cierraA
                    ? `ABIERTO · CIERRA ${resto.cierraA}`
                    : 'ABIERTO'
                  : 'CERRADO AHORA'}
              </span>
            )}
            <span className="ml-1 font-mono text-[11.5px] tracking-wider text-tinta-3">
              {platos.length} PLATOS · PRECIOS EN PESOS
            </span>
          </div>
        </div>
      </div>

      {/* Categorías */}
      {resto.carta.length > 0 && (
        <div className="sticky top-[57px] z-[900] flex flex-wrap gap-2 border-b border-regla bg-papel/93 px-4 py-3.5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() => setCategoria('todo')}
            className={categoria === 'todo' ? 'pastilla pastilla-activa' : 'pastilla'}
          >
            Todo <span className="font-mono text-[11.5px] opacity-70">{platos.length}</span>
          </button>
          {resto.carta.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              className={categoria === c.id ? 'pastilla pastilla-activa' : 'pastilla'}
            >
              {c.nombre}{' '}
              <span className="font-mono text-[11.5px] opacity-70">{c.productos.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-[1100px] px-4 py-9 sm:px-8">
        {resto.carta.length === 0 && (
          <p className="rounded-panel border border-dashed border-regla-2 bg-superficie-2 px-6 py-10 text-center text-sm text-tinta-3">
            Este local todavía no cargó su carta.
          </p>
        )}

        {/* El plato de la casa, a lo ancho */}
        {destacado && categoria === 'todo' && (
          <article className="panel mb-10 grid overflow-hidden sm:grid-cols-[340px_minmax(0,1fr)]">
            <Foto className="h-[220px] sm:h-full" tamIcono={44} />
            <div className="flex flex-col justify-center px-7 py-7">
              <span className="chip chip-vino mb-3 self-start">
                <Estrella tam={11} />
                EL MÁS PEDIDO
              </span>
              <h2 className="mb-2 text-[28px] leading-tight">{destacado.nombre}</h2>
              {destacado.descripcion && (
                <p className="mb-5 max-w-xl text-[15px] leading-relaxed text-tinta-2">
                  {destacado.descripcion}
                </p>
              )}
              <div className="flex max-w-xl items-baseline gap-2">
                <span className="volanta text-tinta-3">Precio</span>
                <span className="grow -translate-y-[3px] border-b border-dotted border-regla-2" />
                <span className="font-mono text-2xl text-tinta">
                  {formatearPrecio(destacado.precio)}
                </span>
              </div>
            </div>
          </article>
        )}

        {visibles.map((c) => (
          <Seccion key={c.id} categoria={c} />
        ))}

        {resto.carta.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-r-panel border-l-[3px] border-ambar bg-ambar-suave px-5 py-4">
            <Aviso tam={19} className="shrink-0 text-ambar" />
            <p className="m-0 grow text-[13.5px] leading-relaxed text-tinta-2">
              <strong className="font-semibold text-tinta">
                Los precios y la disponibilidad los carga el propio restaurante.
              </strong>{' '}
              Si un plato aparece como «hoy no hay», es porque el local lo marcó sin stock.
              Consultá al mozo por alérgenos antes de pedir.
            </p>
            <Link to={`/restaurante/${resto.id}#reservar`} className="no-underline">
              <BotonSpecular>Reservar mesa</BotonSpecular>
            </Link>
          </div>
        )}
      </div>
    </Marco>
  )
}

function Seccion({ categoria }: { categoria: CategoriaCarta }) {
  return (
    <section className="mb-11 last:mb-0">
      <div className="mb-5 flex items-baseline gap-3.5 border-b-2 border-tinta pb-2.5">
        <h2 className="volanta m-0 text-ambar">{categoria.nombre}</h2>
        <span className="font-mono text-[11px] text-tinta-3">
          {categoria.productos.length} {categoria.productos.length === 1 ? 'plato' : 'platos'}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {categoria.productos.map((p) => (
          <article
            key={p.id}
            className={`grid grid-cols-[116px_minmax(0,1fr)] gap-4 rounded-panel border border-regla bg-superficie p-3.5 transition ${
              p.activo && !p.sinStock
                ? 'hover:-translate-y-0.5 hover:border-regla-2 hover:shadow-panel'
                : 'opacity-55'
            }`}
          >
            {/* Marco de la foto del plato */}
            <Foto className="h-[116px] w-[116px] rounded-[10px] border border-regla" tamIcono={26} />

            <div className="min-w-0 self-center">
              <div className="mb-1.5 flex items-baseline gap-2">
                <h3 className="m-0 font-display text-[18px] leading-tight font-semibold">
                  {p.nombre}
                </h3>
                <span className="grow -translate-y-[3px] border-b border-dotted border-regla-2" />
                <span className="font-mono text-[15px] whitespace-nowrap">
                  {formatearPrecio(p.precio)}
                </span>
              </div>

              {p.descripcion && (
                <p className="m-0 mb-2.5 text-[13.5px] leading-snug text-tinta-3">{p.descripcion}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {!p.activo && <span className="chip">HOY NO HAY</span>}
                {/* Este cartel no lo pone nadie a mano: sale del stock del
                    depósito. Si a la receta del plato no le alcanza algún
                    ingrediente, aparece solo. */}
                {p.activo && p.sinStock && <span className="chip chip-ambar">SIN STOCK HOY</span>}
                {p.destacado && p.activo && !p.sinStock && (
                  <span className="chip chip-vino">
                    <Estrella tam={10} />
                    EL MÁS PEDIDO
                  </span>
                )}
                {p.vegetariano && (
                  <span className="chip chip-verde">
                    <Hoja tam={11} />
                    VEGETARIANO
                  </span>
                )}
                {p.sinTacc && <span className="chip">SIN TACC</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Marco({
  id,
  nombre,
  children,
}: {
  id: string | undefined
  nombre?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-papel">
      <Encabezado compacto>
        <Link
          to={`/restaurante/${id ?? ''}`}
          className="flex items-center gap-2 text-[13.5px] font-semibold text-tinta-2 no-underline hover:text-tinta"
        >
          <Volver tam={15} />
          <span className="hidden sm:inline">Volver a {nombre ?? 'el restaurante'}</span>
          <span className="sm:hidden">Volver</span>
        </Link>
      </Encabezado>
      {children}
    </div>
  )
}
