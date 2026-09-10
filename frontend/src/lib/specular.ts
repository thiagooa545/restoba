/**
 * Motor del reflejo especular de los botones.
 *
 * Un solo listener de puntero y un solo requestAnimationFrame para todos los
 * botones de la página: cada uno recibe el ángulo hacia el cursor y cuán cerca
 * está, como variables CSS. El dibujo lo hace el CSS con un conic-gradient
 * enmascarado sobre el borde.
 *
 * La primera versión de esto usaba WebGL, uno por botón. Se cambió porque cada
 * contexto de WebGL es un recurso escaso —los navegadores admiten unos pocos
 * por página— y porque en una máquina sin aceleración no se veía nada.
 */

type Registrado = { el: HTMLElement; angulo: number; cerca: number }

const botones = new Set<Registrado>()
let cuadro = 0
let puntero: { x: number; y: number } | null = null
let anguloLibre = 40
let anterior = 0

/** Distancia a la que el reflejo empieza a encenderse. */
const ALCANCE = 260

function menosMovimiento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function alMoverPuntero(e: PointerEvent) {
  puntero = { x: e.clientX, y: e.clientY }
}

function paso(ahora: number) {
  cuadro = requestAnimationFrame(paso)
  const dt = Math.min((ahora - anterior) / 1000, 0.05)
  anterior = ahora

  // Sin puntero, la luz gira sola despacio.
  anguloLibre = (anguloLibre + 22 * dt) % 360

  for (const b of botones) {
    const r = b.el.getBoundingClientRect()
    if (r.width === 0) continue

    let objetivo = anguloLibre
    let cerca = 0

    if (puntero) {
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = Math.max(r.left - puntero.x, 0, puntero.x - r.right)
      const dy = Math.max(r.top - puntero.y, 0, puntero.y - r.bottom)
      const dist = Math.hypot(dx, dy)

      // El ángulo del conic-gradient corre en sentido horario desde arriba;
      // el atan2 corre antihorario desde la derecha. De ahí el 90 menos.
      objetivo = (90 - (Math.atan2(cy - puntero.y, puntero.x - cx) * 180) / Math.PI + 360) % 360

      const t = Math.max(0, 1 - dist / ALCANCE)
      cerca = t * t * (3 - 2 * t)
    }

    // Se persigue el ángulo por el camino corto, para que no dé la vuelta larga.
    const giro = ((objetivo - b.angulo + 540) % 360) - 180
    b.angulo = (b.angulo + giro * (1 - Math.exp(-dt * 9)) + 360) % 360
    b.cerca += (cerca - b.cerca) * (1 - Math.exp(-dt * 7))

    b.el.style.setProperty('--sp-angulo', b.angulo.toFixed(1))
    b.el.style.setProperty('--sp-cerca', b.cerca.toFixed(3))
  }
}

function arrancar() {
  if (cuadro) return
  window.addEventListener('pointermove', alMoverPuntero, { passive: true })
  anterior = performance.now()
  cuadro = requestAnimationFrame(paso)
}

function parar() {
  if (!cuadro) return
  cancelAnimationFrame(cuadro)
  cuadro = 0
  window.removeEventListener('pointermove', alMoverPuntero)
}

/** Registra un botón. Devuelve la función que lo da de baja. */
export function seguirPuntero(el: HTMLElement): () => void {
  if (menosMovimiento()) {
    // Queda un reflejo fijo y quieto, sin animación.
    el.style.setProperty('--sp-angulo', '40')
    el.style.setProperty('--sp-cerca', '0.5')
    return () => undefined
  }

  const registro: Registrado = { el, angulo: anguloLibre, cerca: 0 }
  botones.add(registro)
  arrancar()

  return () => {
    botones.delete(registro)
    if (botones.size === 0) parar()
  }
}
