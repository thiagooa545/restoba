/**
 * Iconografía propia, en SVG de trazo sobre grilla de 24.
 * Nada de emojis: escalan mal y no se recolorean con el tema.
 */
type Props = { tam?: number; className?: string }

function base(tam: number, className?: string) {
  return {
    width: tam,
    height: tam,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export const Lupa = ({ tam = 18, className }: Props) => (
  <svg {...base(tam, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </svg>
)

export const Pin = ({ tam = 18, className }: Props) => (
  <svg {...base(tam, className)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)

export const Estrella = ({ tam = 18, className }: Props) => (
  <svg {...base(tam, className)} fill="currentColor" stroke="none">
    <path d="M12 3.2l2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6-4.3-4.2 5.9-.8Z" />
  </svg>
)

export const Cubiertos = ({ tam = 24, className }: Props) => (
  <svg {...base(tam, className)} strokeWidth={1.3}>
    <path d="M7 3v8a2.5 2.5 0 0 0 5 0V3" />
    <path d="M9.5 11v10" />
    <path d="M17 3c-1.5 1.5-2 3.5-2 6s.7 3 2 3 2-.6 2-3-.5-4.5-2-6Z" />
    <path d="M17 12v9" />
  </svg>
)

export const Volver = ({ tam = 16, className }: Props) => (
  <svg {...base(tam, className)} strokeWidth={1.9}>
    <path d="M14 6l-6 6 6 6" />
  </svg>
)

export const Aviso = ({ tam = 18, className }: Props) => (
  <svg {...base(tam, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5" />
    <path d="M12 16.2v.2" />
  </svg>
)

export const Reloj = ({ tam = 16, className }: Props) => (
  <svg {...base(tam, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const Telefono = ({ tam = 16, className }: Props) => (
  <svg {...base(tam, className)}>
    <path d="M6.5 3.5h3l1.5 4-2 1.4a11 11 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
  </svg>
)

export const Hoja = ({ tam = 14, className }: Props) => (
  <svg {...base(tam, className)} strokeWidth={1.8}>
    <path d="M12 20c-4 0-7-3-7-7 0-4.5 4-8.5 7-10 3 1.5 7 5.5 7 10 0 4-3 7-7 7Z" />
    <path d="M12 20V9" />
  </svg>
)
