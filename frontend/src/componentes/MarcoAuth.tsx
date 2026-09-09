import { Link } from 'react-router'

/** Marco compartido por ingresar y registrarse: papel, marca y una sola columna. */
export function MarcoAuth({
  volanta,
  titulo,
  bajada,
  children,
  pie,
}: {
  volanta: string
  titulo: string
  bajada: string
  children: React.ReactNode
  pie: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-superficie-2">
      <div
        className="pointer-events-none fixed inset-0 opacity-55"
        style={{
          backgroundImage: 'radial-gradient(var(--rb-regla-2) 1.1px, transparent 1.1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-4 py-12">
        <Link
          to="/"
          className="mb-8 self-start font-display text-[23px] font-semibold tracking-tight text-tinta no-underline"
        >
          RestoBA
        </Link>

        <div className="panel px-6 py-8 shadow-flotante sm:px-8">
          <p className="volanta mb-3 text-vino">{volanta}</p>
          <h1 className="mb-3 text-[34px] leading-tight">{titulo}</h1>
          <p className="mb-7 text-[15px] leading-relaxed text-tinta-2">{bajada}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-tinta-2">{pie}</p>
      </div>
    </div>
  )
}

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className="mb-4 block">
      <span className="volanta mb-1.5 block text-tinta-3">{etiqueta}</span>
      <input
        {...props}
        className="w-full rounded-[10px] border border-regla-2 bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none transition-colors placeholder:text-tinta-3 focus:border-vino"
      />
      {ayuda && <span className="mt-1.5 block text-[12.5px] leading-snug text-tinta-3">{ayuda}</span>}
    </label>
  )
}

export function ErrorForm({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p className="mb-4 rounded-r-[10px] border-l-[3px] border-vino bg-vino-suave px-4 py-3 text-[13.5px] leading-snug text-tinta-2">
      {mensaje}
    </p>
  )
}
