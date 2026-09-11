/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La pantalla de aceptación del marco legal. Es la más exigente del proyecto.

   No es un «acepto los términos» con una casilla. Cumple cinco requisitos
   obligatorios que exige el Acuerdo de Verificación:

     1. Se exhibe el texto COMPLETO de cada documento, no un resumen.
     2. Una casilla independiente por documento, y ninguna viene premarcada.
     3. El botón de confirmar no se habilita hasta marcar las tres.
     4. Se registra la constancia con la huella del texto exhibido.
     5. Se puede salir sin aceptar y seguir usando la plataforma en modo lectura.

   El quinto es el que suele olvidarse: aceptar tiene que ser una elección real,
   no la única salida de la pantalla.

   Responde a: factibilidad legal (apartado 8.4) y Ley 25.326.
   ════════════════════════════════════════════════════════════════════ */

import {
  DOCUMENTOS_LEGALES,
  type ComensalPublico,
  type DocumentoLegal,
  type DocumentoLegalRespuesta,
} from '@restoba/compartido'
import { useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { Link } from 'react-router'
import remarkGfm from 'remark-gfm'
import { aceptarDocumento, documentoLegal, ErrorApi } from '../lib/cliente'
import { BotonSpecular } from './BotonSpecular'

const TITULOS: Record<DocumentoLegal, string> = {
  tyc: 'Términos y Condiciones',
  privacidad: 'Política de Privacidad',
  verificacion: 'Acuerdo de Verificación',
}

const RESUMEN: Record<DocumentoLegal, string> = {
  tyc: 'Reglas de uso, niveles de acceso, reseñas, puntos, reservas y jurisdicción.',
  privacidad: 'Qué datos guardamos, para qué, cuánto tiempo y cómo ejercer tus derechos.',
  verificacion: 'Los compromisos que asumís al reseñar y reservar.',
}

/**
 * Pantalla de aceptación del marco legal.
 *
 * Cumple los cinco requisitos obligatorios de legal/README.md:
 *   1. Exhibe el texto completo de cada documento, no un resumen.
 *   2. Una casilla independiente por documento, ninguna premarcada.
 *   3. El botón de confirmación está deshabilitado hasta que estén las tres.
 *   4. Registra la constancia con el SHA-256 del texto exhibido.
 *   5. Ofrece una salida clara: se puede cerrar sin aceptar.
 */
export function GateLegal({
  onActualizar,
}: {
  comensal: ComensalPublico
  onActualizar: (c: ComensalPublico) => void
}) {
  const [documentos, setDocumentos] = useState<Record<string, DocumentoLegalRespuesta>>({})
  const [activo, setActivo] = useState<DocumentoLegal>('tyc')
  const [leidos, setLeidos] = useState<Set<DocumentoLegal>>(new Set(['tyc']))
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se cargan los tres de entrada: sin el texto no hay hash, y sin hash no hay
  // constancia que valga.
  useEffect(() => {
    const ctrl = new AbortController()

    Promise.all(DOCUMENTOS_LEGALES.map((d) => documentoLegal(d, ctrl.signal)))
      .then((lista) => {
        const mapa: Record<string, DocumentoLegalRespuesta> = {}
        for (const doc of lista) mapa[doc.documento] = doc
        setDocumentos(mapa)
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError('No pudimos cargar los documentos. Recargá la página.')
      })

    return () => ctrl.abort()
  }, [])

  const doc = documentos[activo]
  const listo = useMemo(() => DOCUMENTOS_LEGALES.every((d) => marcados[d]), [marcados])
  const faltan = DOCUMENTOS_LEGALES.filter((d) => !marcados[d]).length

  function abrir(clave: DocumentoLegal) {
    setActivo(clave)
    setLeidos((previo) => new Set(previo).add(clave))
  }

  async function confirmar() {
    setError(null)
    setEnviando(true)

    try {
      let ultimo: ComensalPublico | null = null

      for (const clave of DOCUMENTOS_LEGALES) {
        const d = documentos[clave]
        if (!d) throw new Error('documento_faltante')
        const r = await aceptarDocumento({
          documento: clave,
          version: d.version,
          // El hash es el del texto que se exhibió en esta pantalla.
          hash: d.hash,
        })
        ultimo = r.comensal
      }

      if (ultimo) onActualizar(ultimo)
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.detalle ?? 'No pudimos registrar la aceptación.')
          : 'No pudimos registrar la aceptación. Probá de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      {/* Selector de documento */}
      <div className="mb-5 grid gap-2.5 sm:grid-cols-3">
        {DOCUMENTOS_LEGALES.map((clave, i) => {
          const aceptado = marcados[clave]
          const esActivo = activo === clave
          return (
            <button
              key={clave}
              type="button"
              onClick={() => abrir(clave)}
              className={`grid cursor-pointer grid-cols-[24px_minmax(0,1fr)] items-center gap-2.5 rounded-boton border px-3.5 py-3 text-left transition ${
                esActivo
                  ? 'border-vino bg-vino-suave'
                  : aceptado
                    ? 'border-verde/40 bg-verde-suave'
                    : 'border-regla bg-superficie hover:border-regla-2'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-xs ${
                  aceptado
                    ? 'border-verde bg-verde text-papel'
                    : esActivo
                      ? 'border-vino bg-superficie text-vino'
                      : 'border-regla-2 bg-papel text-tinta-3'
                }`}
              >
                {aceptado ? '✓' : i + 1}
              </span>
              <span>
                <span className="block text-sm leading-tight font-semibold text-tinta">
                  {TITULOS[clave]}
                </span>
                <span className="block font-mono text-[11px] text-tinta-3">{clave} · v1.0</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Lector */}
      <div className="mb-6 overflow-hidden rounded-panel border border-regla-2 bg-superficie shadow-panel">
        <div className="flex flex-wrap items-center gap-3 border-b border-regla bg-superficie-2 px-5 py-3.5">
          <b className="mr-auto font-display text-[17px] font-semibold">{TITULOS[activo]}</b>
          <span className="chip">{activo.toUpperCase()}</span>
          <span className="chip">V{doc?.version ?? '1.0'}</span>
        </div>

        <div className="md h-[380px] overflow-y-auto px-6 py-6">
          {doc ? (
            <Markdown remarkPlugins={[remarkGfm]}>{doc.markdown}</Markdown>
          ) : (
            <p className="text-sm text-tinta-3">Cargando el texto completo…</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-regla bg-superficie-2 px-5 py-3">
          <span className="volanta text-tinta-3">SHA-256 del texto exhibido</span>
          <span className="font-mono text-[11.5px] break-all text-tinta-2">
            {doc?.hash ?? '…'}
          </span>
        </div>
      </div>

      {/* Casillas */}
      <div className="overflow-hidden rounded-panel border border-regla-2 bg-superficie">
        <div className="border-b border-regla bg-superficie-2 px-5 py-3.5">
          <b className="font-display text-[17px] font-semibold">Tu conformidad</b>
        </div>

        <div className="px-5 pt-1 pb-5">
          {DOCUMENTOS_LEGALES.map((clave) => {
            const leido = leidos.has(clave)
            return (
              <div
                key={clave}
                className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3 border-b border-regla py-3.5 last:border-b-0"
              >
                <input
                  id={`ac-${clave}`}
                  type="checkbox"
                  // Ninguna viene premarcada, y cada una es independiente.
                  checked={marcados[clave] ?? false}
                  disabled={!leido}
                  onChange={(e) =>
                    setMarcados((previo) => ({ ...previo, [clave]: e.target.checked }))
                  }
                  className="mt-1 h-[17px] w-[17px] cursor-pointer accent-vino disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div>
                  <label
                    htmlFor={`ac-${clave}`}
                    className={`block text-[14.5px] leading-snug font-semibold ${leido ? 'cursor-pointer text-tinta' : 'text-tinta-3'}`}
                  >
                    Leí y acepto {TITULOS[clave] === 'Términos y Condiciones' ? 'los' : 'la'}{' '}
                    {TITULOS[clave]}
                  </label>
                  <p className="mt-1 text-[13px] leading-snug text-tinta-3">
                    Versión 1.0 · {RESUMEN[clave]}{' '}
                    {!leido && (
                      <button
                        type="button"
                        onClick={() => abrir(clave)}
                        className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-vino underline underline-offset-2"
                      >
                        Abrilo para poder marcarlo
                      </button>
                    )}
                  </p>
                </div>
              </div>
            )
          })}

          {error && (
            <p className="mt-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] leading-snug text-tinta-2">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-regla pt-5">
            <BotonSpecular disabled={!listo || enviando} onClick={() => void confirmar()}>
              {enviando ? 'Registrando…' : 'Confirmar y verificar mi cuenta'}
            </BotonSpecular>
            <span
              className={`text-[13.5px] leading-snug ${listo ? 'font-semibold text-verde' : 'text-tinta-3'}`}
            >
              {listo
                ? 'Las tres casillas están marcadas.'
                : faltan === 1
                  ? 'Falta marcar 1 casilla.'
                  : `Faltan ${faltan} casillas por marcar.`}
            </span>
          </div>
        </div>
      </div>

      {/* Salida clara */}
      <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-r-panel border-l-[3px] border-regla-2 bg-superficie-2 px-4.5 py-4">
        <p className="m-0 grow text-[13.5px] leading-relaxed text-tinta-2">
          Podés cerrar sin aceptar. Vas a seguir usando RestoBA en{' '}
          <strong className="font-semibold text-tinta">modo lectura</strong>: buscar, ver menús y
          leer reseñas. No vas a poder reservar, reseñar ni sumar puntos hasta que aceptes, y no se
          borra ninguno de tus datos.
        </p>
        <Link to="/" className="boton boton-fantasma boton-chico shrink-0 no-underline">
          Salir sin aceptar
        </Link>
      </div>
    </section>
  )
}
