/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   Los datos de ejemplo del depósito: la despensa y las recetas.

   Por qué están acá y no inventados a mano en la demo: para poder
   mostrar el panel de stock funcionando hace falta que ya existan
   ingredientes cargados, con algunos por debajo del mínimo (si no, la
   alerta nunca se ve) y con historial de movimientos (si no, el libro
   está vacío y no se entiende para qué sirve).

   Las recetas no se escriben plato por plato para los 65 productos de
   la carta: se arman por palabra clave sobre el nombre del plato. Si
   el plato dice «milanesa», lleva carne, pan rallado y huevo. Es una
   aproximación aceptable para datos de prueba, y deja claro que la
   receta es un dato del restaurante, no algo que el sistema adivine.
   ════════════════════════════════════════════════════════════════════ */

import type { Unidad } from '@restoba/compartido'

type SemillaIngrediente = {
  nombre: string
  unidad: Unidad
  /** Cuánto hay hoy en el depósito. */
  stock: number
  /** Por debajo de esto, el panel avisa. */
  minimo: number
  costo: number
}

/**
 * Una despensa razonable de restaurante porteño. Es la misma para todos los
 * locales porque los ingredientes base se repiten; lo que cambia de local en
 * local son las recetas y las cantidades.
 */
export const DESPENSA: SemillaIngrediente[] = [
  { nombre: 'Carne picada', unidad: 'kg', stock: 18, minimo: 6, costo: 8500 },
  { nombre: 'Peceto', unidad: 'kg', stock: 12, minimo: 5, costo: 11200 },
  { nombre: 'Pollo', unidad: 'kg', stock: 14, minimo: 6, costo: 6400 },
  { nombre: 'Harina 000', unidad: 'kg', stock: 25, minimo: 10, costo: 1350 },
  { nombre: 'Pan rallado', unidad: 'kg', stock: 4, minimo: 3, costo: 1800 },
  { nombre: 'Huevos', unidad: 'docena', stock: 9, minimo: 4, costo: 4200 },
  { nombre: 'Mozzarella', unidad: 'kg', stock: 7, minimo: 4, costo: 9200 },
  { nombre: 'Queso provolone', unidad: 'kg', stock: 2.5, minimo: 2, costo: 13800 },
  { nombre: 'Ricota', unidad: 'kg', stock: 3, minimo: 2, costo: 5600 },
  { nombre: 'Tomate perita', unidad: 'kg', stock: 16, minimo: 8, costo: 2100 },
  { nombre: 'Papa', unidad: 'kg', stock: 30, minimo: 12, costo: 1100 },
  { nombre: 'Cebolla', unidad: 'kg', stock: 11, minimo: 5, costo: 1250 },
  { nombre: 'Verdura de hoja', unidad: 'atado', stock: 6, minimo: 4, costo: 1600 },
  { nombre: 'Aceite de girasol', unidad: 'l', stock: 20, minimo: 8, costo: 2900 },
  { nombre: 'Manteca', unidad: 'kg', stock: 2, minimo: 2, costo: 10500 },
  { nombre: 'Leche', unidad: 'l', stock: 24, minimo: 10, costo: 1450 },
  { nombre: 'Café en grano', unidad: 'kg', stock: 5, minimo: 2, costo: 22000 },
  { nombre: 'Azúcar', unidad: 'kg', stock: 12, minimo: 5, costo: 1300 },
  { nombre: 'Dulce de leche', unidad: 'kg', stock: 4, minimo: 2, costo: 6800 },
  { nombre: 'Frutilla', unidad: 'kg', stock: 3, minimo: 3, costo: 5400 },
  { nombre: 'Banana', unidad: 'kg', stock: 8, minimo: 4, costo: 2200 },
  { nombre: 'Calamar', unidad: 'kg', stock: 6, minimo: 3, costo: 14500 },
  { nombre: 'Berenjena', unidad: 'kg', stock: 5, minimo: 3, costo: 2600 },
  { nombre: 'Chocolate semiamargo', unidad: 'kg', stock: 2.2, minimo: 2, costo: 15900 },
]

/**
 * Recetas por palabra clave. Se aplica la primera regla que coincida con el
 * nombre del plato; si ninguna coincide, ese plato queda sin receta, que es
 * exactamente lo que pasa en un local real recién cargado.
 */
export const RECETAS: { palabras: string[]; items: [string, number][] }[] = [
  {
    palabras: ['milanesa', 'napolitana', 'suprema'],
    items: [['Carne picada', 0.22], ['Pan rallado', 0.06], ['Huevos', 0.17], ['Mozzarella', 0.08]],
  },
  {
    palabras: ['provoleta'],
    items: [['Queso provolone', 0.18]],
  },
  {
    palabras: ['rabas', 'calamar'],
    items: [['Calamar', 0.2], ['Harina 000', 0.05], ['Aceite de girasol', 0.1]],
  },
  {
    palabras: ['berenjena'],
    items: [['Berenjena', 0.25], ['Aceite de girasol', 0.08], ['Cebolla', 0.05]],
  },
  {
    palabras: ['sorrentino', 'ravioles', 'ravioli', 'agnolotti', 'canelones'],
    items: [['Harina 000', 0.12], ['Huevos', 0.17], ['Ricota', 0.09], ['Mozzarella', 0.05]],
  },
  {
    palabras: ['ñoqui', 'noqui', 'gnocchi'],
    items: [['Papa', 0.3], ['Harina 000', 0.08], ['Huevos', 0.08]],
  },
  {
    palabras: ['risotto', 'tagliatelle', 'ragú', 'ragu'],
    items: [['Harina 000', 0.11], ['Tomate perita', 0.14], ['Cebolla', 0.06], ['Manteca', 0.02]],
  },
  {
    palabras: ['vitel', 'peceto'],
    items: [['Peceto', 0.18], ['Huevos', 0.08], ['Aceite de girasol', 0.05]],
  },
  {
    palabras: ['budín', 'budin', 'panna cotta', 'queso y dulce'],
    items: [['Leche', 0.25], ['Azúcar', 0.07], ['Dulce de leche', 0.05]],
  },
  {
    palabras: ['tallarines', 'spaghetti', 'fideos', 'pasta', 'lasaña', 'lasagna'],
    items: [['Harina 000', 0.14], ['Huevos', 0.17], ['Tomate perita', 0.15]],
  },
  {
    palabras: ['pizza', 'fugazzeta', 'fainá', 'faina'],
    items: [['Harina 000', 0.25], ['Mozzarella', 0.2], ['Tomate perita', 0.12]],
  },
  {
    palabras: ['empanada', 'tarta'],
    items: [['Harina 000', 0.1], ['Carne picada', 0.12], ['Cebolla', 0.06]],
  },
  {
    palabras: ['asado', 'bife', 'entraña', 'vacío', 'vacio', 'costilla', 'ojo de bife', 'lomo'],
    items: [['Peceto', 0.35], ['Papa', 0.2]],
  },
  {
    palabras: ['pollo', 'suprema de pollo'],
    items: [['Pollo', 0.32], ['Papa', 0.18]],
  },
  {
    palabras: ['ensalada', 'verde', 'rúcula', 'rucula'],
    items: [['Verdura de hoja', 1], ['Tomate perita', 0.1], ['Cebolla', 0.04]],
  },
  {
    palabras: ['papas', 'fritas'],
    items: [['Papa', 0.35], ['Aceite de girasol', 0.12]],
  },
  {
    palabras: ['flan', 'panqueque', 'panqueques'],
    items: [['Huevos', 0.25], ['Leche', 0.3], ['Azúcar', 0.08], ['Dulce de leche', 0.06]],
  },
  {
    palabras: ['volcán', 'volcan', 'brownie', 'chocotorta', 'chocolate'],
    items: [['Chocolate semiamargo', 0.09], ['Harina 000', 0.05], ['Huevos', 0.17], ['Manteca', 0.05]],
  },
  {
    palabras: ['tiramisú', 'tiramisu', 'cheesecake', 'helado'],
    items: [['Ricota', 0.1], ['Azúcar', 0.05], ['Frutilla', 0.06]],
  },
  {
    palabras: ['latte', 'cortado', 'capuchino', 'cappuccino', 'café', 'cafe', 'espresso', 'flat white'],
    items: [['Café en grano', 0.018], ['Leche', 0.2]],
  },
  {
    palabras: ['licuado', 'smoothie', 'jugo'],
    items: [['Banana', 0.18], ['Frutilla', 0.1], ['Leche', 0.25]],
  },
  {
    palabras: ['tostado', 'tostada', 'medialuna', 'sándwich', 'sandwich'],
    items: [['Harina 000', 0.09], ['Manteca', 0.02], ['Mozzarella', 0.05]],
  },
  {
    palabras: ['revuelto', 'huevo', 'omelette'],
    items: [['Huevos', 0.25], ['Cebolla', 0.05], ['Manteca', 0.01]],
  },
]

/** La receta que le corresponde a un plato según su nombre, o null. */
export function recetaPara(nombrePlato: string): [string, number][] | null {
  const nombre = nombrePlato
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  for (const regla of RECETAS) {
    const pega = regla.palabras.some((palabra) =>
      nombre.includes(palabra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
    )
    if (pega) return regla.items
  }
  return null
}

/**
 * Movimientos de los últimos días, para que el libro tenga historia cuando se
 * muestra el panel. El orden es el de antigüedad: el primero es de ayer.
 * [ingrediente, cantidad con signo, motivo, nota]
 */
export const HISTORIA_STOCK: [string, number, 'compra' | 'merma' | 'ajuste', string][] = [
  ['Carne picada', 10, 'compra', 'Frigorífico Sur · remito 4418'],
  ['Mozzarella', 6, 'compra', 'Lácteos Pompeya'],
  ['Papa', 25, 'compra', 'Mercado Central'],
  ['Verdura de hoja', -2, 'merma', 'Se pasó, no estaba para servir'],
  ['Leche', 12, 'compra', 'Lácteos Pompeya'],
  ['Huevos', -1, 'merma', 'Cajón roto en la descarga'],
  ['Harina 000', 20, 'compra', 'Molino Cañuelas'],
  ['Tomate perita', -1.5, 'ajuste', 'Recuento del lunes: había menos de lo anotado'],
]
