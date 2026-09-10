import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/**
 * Botón con reflejo especular.
 *
 * Adaptado del componente SpecularButton de React Bits (reactbits.dev,
 * MIT + Commons Clause) a la paleta de RestoBA: el trazo del reflejo dibuja el
 * borde del botón y la luz sigue al puntero.
 *
 * Dibuja con WebGL, así que va SOLO en los botones principales: cada instancia
 * es un contexto de WebGL y los navegadores admiten unos pocos por página.
 * Para el resto están las clases .boton del sistema de diseño.
 *
 * Si el sistema pide menos movimiento, no se monta nada y queda un botón común.
 */

type Props = {
  children: ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  /** Color del relleno. Por defecto, el vino de la marca. */
  fondo?: string
  /** Color del reflejo que recorre el borde. */
  brillo?: string
  texto?: string
  radio?: number
}

const MARGEN = 20

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCentro;
uniform vec2 uMedio;
uniform float uRadio;
uniform float uAngulo;
uniform float uPx;
uniform vec3 uBrillo;
uniform vec3 uFondo;
uniform float uIntensidad;
uniform float uAncho;

out vec4 fragColor;

float rectRedondeado(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float linea(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCentro;
  float d = rectRedondeado(p, uMedio, uRadio);
  vec2 L = vec2(cos(uAngulo), sin(uAngulo));

  // Relleno macizo hasta el borde: el botón es opaco, no un contorno.
  float dentro = 1.0 - smoothstep(-1.0, 1.0, d);

  // Reflejo: la franja del borde orientada hacia la luz se enciende.
  vec2 normal = normalize(p / (uMedio * uMedio) + 1e-6);
  float phi = acos(clamp(abs(dot(normal, L)), 0.0, 1.0));
  float franja = 1.0 - smoothstep(0.17, 0.9, phi);
  float borde = linea(d, uAncho) * (1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d)));
  float reflejo = borde * franja * uIntensidad;

  vec3 color = uFondo * dentro + uBrillo * reflejo;
  fragColor = vec4(color, clamp(dentro + reflejo, 0.0, 1.0));
}
`

function menosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function BotonSpecular({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  fondo = '#7C2239',
  brillo = '#FFE8EE',
  texto = '#FFFFFF',
  radio = 12,
}: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const lienzo = useRef<HTMLSpanElement>(null)
  const opciones = useRef({ fondo, brillo, radio })
  opciones.current = { fondo, brillo, radio }

  useEffect(() => {
    const btn = boton.current
    const caja = lienzo.current
    if (!btn || !caja || menosMovimiento()) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let renderer: Renderer
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr })
    } catch {
      // Sin WebGL disponible el botón sigue funcionando, solo que plano.
      return
    }

    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const geometria = new Triangle(gl)
    if (geometria.attributes.uv) delete geometria.attributes.uv

    const programa = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCentro: { value: [0, 0] },
        uMedio: { value: [1, 1] },
        uRadio: { value: 0 },
        uAngulo: { value: 2.4 },
        uPx: { value: dpr },
        uBrillo: { value: [1, 1, 1] },
        uFondo: { value: [0.49, 0.13, 0.22] },
        uIntensidad: { value: 0 },
        uAncho: { value: dpr },
      },
    })

    const malla = new Mesh(gl, { geometry: geometria, program: programa })
    caja.appendChild(gl.canvas)

    const medida = { ancho: 1, alto: 1 }
    const redimensionar = () => {
      const r = btn.getBoundingClientRect()
      medida.ancho = r.width
      medida.alto = r.height
      renderer.setSize(r.width + MARGEN * 2, r.height + MARGEN * 2)
      programa.uniforms.uCentro.value = [(MARGEN + r.width / 2) * dpr, (MARGEN + r.height / 2) * dpr]
      programa.uniforms.uMedio.value = [(r.width / 2) * dpr, (r.height / 2) * dpr]
    }

    const observador = new ResizeObserver(redimensionar)
    observador.observe(btn)
    redimensionar()

    // La luz apunta al puntero y se apaga cuando está lejos; si nadie mueve
    // el mouse, gira sola despacio.
    let anguloPuntero: number | null = null
    let cercania = 0

    const alMover = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
      const dist = Math.hypot(dx, dy)

      anguloPuntero =
        dist === 0
          ? Math.atan2(2 / r.height, -2 / r.width) +
            ((e.clientX - cx) / (r.width / 2)) * 0.3 +
            ((cy - e.clientY) / (r.height / 2)) * 0.15
          : Math.atan2(cy - e.clientY, e.clientX - cx)

      const t = Math.max(0, 1 - dist / 260)
      cercania = t * t * (3 - 2 * t)
    }
    window.addEventListener('pointermove', alMover)

    let angulo = 2.4
    let anguloLibre = 2.4
    let brilloActual = 0
    let anterior = performance.now()
    let cuadro = 0

    const colorBrillo = new Color()
    const colorFondo = new Color()

    const dibujar = (ahora: number) => {
      cuadro = requestAnimationFrame(dibujar)
      const dt = Math.min((ahora - anterior) / 1000, 0.05)
      anterior = ahora

      anguloLibre += 0.35 * dt
      const objetivo = anguloPuntero ?? anguloLibre
      const giro = ((objetivo - angulo + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      angulo += giro * (1 - Math.exp(-dt * 7))
      brilloActual += (cercania - brilloActual) * (1 - Math.exp(-dt * 8))

      colorBrillo.set(opciones.current.brillo)
      colorFondo.set(opciones.current.fondo)

      programa.uniforms.uAngulo.value = angulo
      programa.uniforms.uRadio.value =
        Math.min(opciones.current.radio, Math.min(medida.ancho, medida.alto) / 2) * dpr
      programa.uniforms.uBrillo.value = [colorBrillo.r, colorBrillo.g, colorBrillo.b]
      programa.uniforms.uFondo.value = [colorFondo.r, colorFondo.g, colorFondo.b]
      programa.uniforms.uIntensidad.value = 0.35 + brilloActual * 1.15
      programa.uniforms.uAncho.value = 1.1 * dpr

      renderer.render({ scene: malla })
    }
    cuadro = requestAnimationFrame(dibujar)

    return () => {
      cancelAnimationFrame(cuadro)
      observador.disconnect()
      window.removeEventListener('pointermove', alMover)
      if (gl.canvas.parentNode === caja) caja.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <button
      ref={boton}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ '--sp-fondo': fondo, '--sp-texto': texto, '--sp-radio': `${radio}px` } as CSSProperties}
      className={`relative inline-flex cursor-pointer items-center justify-center gap-2 border-0 px-6 py-3 text-[15px] leading-none font-semibold tracking-[0.01em] transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 [background:var(--sp-fondo)] [border-radius:var(--sp-radio)] [color:var(--sp-texto)] ${className}`}
    >
      {/* El canvas se pinta encima del fondo y por debajo del texto. */}
      <span
        ref={lienzo}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-5 z-[1] [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
      />
      <span className="relative z-[2] inline-flex items-center gap-2">{children}</span>
    </button>
  )
}
