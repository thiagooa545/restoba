/** Datos de ejemplo para el prototipo (documento de análisis, apartado 7.3). */

type SemillaProducto = {
  categoria: string
  nombre: string
  descripcion: string
  precio: number
  vegetariano?: boolean
  sinTacc?: boolean
  destacado?: boolean
  activo?: boolean
}

/** [día de la semana (0 = domingo), abre, cierra] */
type SemillaHorario = [number, string, string]

type SemillaRestaurante = {
  nombre: string
  descripcion: string
  plan: string
  estado: 'activa' | 'pendiente_acreditacion' | 'vencida' | 'cancelada'
  direccion: string
  barrio: string
  lat: number
  lng: number
  rangoPrecio: 1 | 2 | 3
  telefono: string
  calificacion: number | null
  resenas: number
  cocinas: string[]
  horarios: SemillaHorario[]
  carta: SemillaProducto[]
}

export const TIPOS_COCINA: { nombre: string; slug: string }[] = [
  { nombre: 'Pastas', slug: 'pastas' },
  { nombre: 'Parrilla', slug: 'parrilla' },
  { nombre: 'Asado', slug: 'asado' },
  { nombre: 'Pizza', slug: 'pizza' },
  { nombre: 'Milanesas', slug: 'milanesas' },
  { nombre: 'Bodegón', slug: 'bodegon' },
  { nombre: 'Italiana', slug: 'italiana' },
  { nombre: 'Casero', slug: 'casero' },
  { nombre: 'Vegetariano', slug: 'vegetariano' },
  { nombre: 'Sushi', slug: 'sushi' },
  { nombre: 'Japonesa', slug: 'japonesa' },
  { nombre: 'Café de especialidad', slug: 'cafe' },
]

/** Martes a domingo, dos turnos. */
const clasico: SemillaHorario[] = [
  [2, '12:00', '15:30'], [2, '20:00', '00:30'],
  [3, '12:00', '15:30'], [3, '20:00', '00:30'],
  [4, '12:00', '15:30'], [4, '20:00', '00:30'],
  [5, '12:00', '16:00'], [5, '20:00', '01:30'],
  [6, '12:00', '16:00'], [6, '20:00', '01:30'],
  [0, '12:00', '16:00'],
]

/** Todos los días, corrido. */
const corrido: SemillaHorario[] = [0, 1, 2, 3, 4, 5, 6].map(
  (d) => [d, '08:00', '20:00'] as SemillaHorario,
)

export const RESTAURANTES: SemillaRestaurante[] = [
  {
    nombre: 'Cantina San Telmo',
    descripcion:
      'Un sótano de mesas largas donde se amasa a la vista todos los días. La carta es corta a propósito: seis pastas, cuatro salsas y lo que haya de estación. Atienden desde 1987 en la misma esquina.',
    plan: 'completo',
    estado: 'activa',
    direccion: 'Defensa 1124',
    barrio: 'San Telmo',
    lat: -34.6215,
    lng: -58.3717,
    rangoPrecio: 2,
    telefono: '+54 11 4361-0000',
    calificacion: 4.8,
    resenas: 312,
    cocinas: ['pastas', 'bodegon', 'italiana'],
    horarios: clasico,
    carta: [
      { categoria: 'Entradas', nombre: 'Provoleta al orégano', descripcion: 'Provolone de campo a la plancha, orégano fresco y aceite de oliva.', precio: 8900, vegetariano: true, sinTacc: true },
      { categoria: 'Entradas', nombre: 'Berenjenas en escabeche', descripcion: 'Receta de la casa, maceradas siete días con laurel y ajo.', precio: 7400, vegetariano: true },
      { categoria: 'Entradas', nombre: 'Rabas a la romana', descripcion: 'Con alioli de limón. Porción pensada para compartir entre dos.', precio: 12600 },
      { categoria: 'Principales', nombre: 'Sorrentinos de jamón y mozzarella', descripcion: 'Masa al huevo amasada cada mañana. Van con la salsa que elijas: fileto, rosa, o manteca y salvia.', precio: 16800, destacado: true },
      { categoria: 'Principales', nombre: 'Ñoquis de papa', descripcion: 'Los días 29, con el billete abajo del plato. Salsa a elección.', precio: 14200, vegetariano: true },
      { categoria: 'Principales', nombre: 'Ravioles de verdura y ricota', descripcion: 'Masa verde al huevo, relleno de acelga y ricota de campo.', precio: 15400, vegetariano: true },
      { categoria: 'Principales', nombre: 'Lasaña de la casa', descripcion: 'Se agotó el ingrediente principal por hoy.', precio: 17900, activo: false },
      { categoria: 'Principales', nombre: 'Milanesa napolitana con papas', descripcion: 'De ternera, con jamón, salsa de tomate y mozzarella gratinada.', precio: 18500 },
      { categoria: 'Postres', nombre: 'Flan mixto', descripcion: 'Dulce de leche y crema batida a mano, sin sifón.', precio: 6200, vegetariano: true },
      { categoria: 'Postres', nombre: 'Tiramisú de la nonna', descripcion: 'Café fuerte, mascarpone y cacao amargo. Se hace por tanda.', precio: 7100, vegetariano: true },
    ],
  },
  {
    nombre: 'Il Gattopardo',
    descripcion:
      'Pastas al huevo hechas a la vista y salsas del norte italiano. Salón chico, doce mesas, reserva casi obligatoria los fines de semana.',
    plan: 'completo',
    estado: 'activa',
    direccion: 'Perú 890',
    barrio: 'Monserrat',
    lat: -34.6165,
    lng: -58.376,
    rangoPrecio: 3,
    telefono: '+54 11 4342-0000',
    calificacion: 4.6,
    resenas: 204,
    cocinas: ['pastas', 'italiana'],
    horarios: clasico,
    carta: [
      { categoria: 'Entradas', nombre: 'Vitel toné', descripcion: 'Peceto fino con salsa de atún y alcaparras.', precio: 11200 },
      { categoria: 'Principales', nombre: 'Tagliatelle al ragú', descripcion: 'Ragú de cocción lenta, ocho horas.', precio: 19800, destacado: true },
      { categoria: 'Principales', nombre: 'Risotto de hongos', descripcion: 'Portobellos, girgolas y queso parmesano.', precio: 18400, vegetariano: true, sinTacc: true },
      { categoria: 'Postres', nombre: 'Panna cotta', descripcion: 'Con frutos rojos de estación.', precio: 7800, vegetariano: true, sinTacc: true },
    ],
  },
  {
    nombre: 'La Rambla de Chacarita',
    descripcion:
      'Ñoquis del 29 y parrilla a leña en el mismo salón. Grande, ruidoso y familiar: ideal para mesas de más de seis.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Jorge Newbery 3420',
    barrio: 'Chacarita',
    lat: -34.5885,
    lng: -58.452,
    rangoPrecio: 2,
    telefono: '+54 11 4553-0000',
    calificacion: 4.7,
    resenas: 486,
    cocinas: ['parrilla', 'pastas', 'asado'],
    horarios: clasico,
    carta: [
      { categoria: 'Parrilla', nombre: 'Bife de chorizo', descripcion: 'Trescientos cincuenta gramos, a las brasas.', precio: 21500, destacado: true, sinTacc: true },
      { categoria: 'Parrilla', nombre: 'Entraña', descripcion: 'Con chimichurri de la casa.', precio: 23000, sinTacc: true },
      { categoria: 'Pastas', nombre: 'Ñoquis de papa', descripcion: 'Con estofado o fileto.', precio: 13800, vegetariano: true },
      { categoria: 'Postres', nombre: 'Queso y dulce', descripcion: 'Mar del Plata y batata con chocolate.', precio: 5900, vegetariano: true, sinTacc: true },
    ],
  },
  {
    nombre: 'Doña Petrona',
    descripcion: 'Cocina de barrio sin vueltas: canelones, milanesas y mesa familiar al mediodía.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Av. Boedo 1240',
    barrio: 'Boedo',
    lat: -34.628,
    lng: -58.4165,
    rangoPrecio: 1,
    telefono: '+54 11 4931-0000',
    calificacion: 4.5,
    resenas: 158,
    cocinas: ['milanesas', 'casero', 'bodegon'],
    horarios: clasico,
    carta: [
      { categoria: 'Principales', nombre: 'Milanesa a caballo', descripcion: 'Con dos huevos fritos y papas.', precio: 12900, destacado: true },
      { categoria: 'Principales', nombre: 'Canelones de verdura', descripcion: 'Gratinados, receta de la casa.', precio: 11500, vegetariano: true },
      { categoria: 'Postres', nombre: 'Budín de pan', descripcion: 'Con dulce de leche.', precio: 4800, vegetariano: true },
    ],
  },
  {
    nombre: 'El Preferido de Boedo',
    descripcion: 'Bodegón de esquina con pizza al molde y vermú en la barra.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Estados Unidos 3455',
    barrio: 'Boedo',
    lat: -34.6222,
    lng: -58.413,
    rangoPrecio: 2,
    telefono: '+54 11 4957-0000',
    calificacion: 4.5,
    resenas: 271,
    cocinas: ['bodegon', 'pizza'],
    horarios: clasico,
    carta: [
      { categoria: 'Pizzas', nombre: 'Fugazzeta rellena', descripcion: 'Al molde, con mucha cebolla.', precio: 14600, vegetariano: true, destacado: true },
      { categoria: 'Pizzas', nombre: 'Muzzarella', descripcion: 'La de siempre, con aceitunas.', precio: 11200, vegetariano: true },
      { categoria: 'Entradas', nombre: 'Fainá', descripcion: 'Para acompañar la porción.', precio: 2600, vegetariano: true, sinTacc: true },
    ],
  },
  {
    nombre: 'Brasa y Sal',
    descripcion: 'Parrilla de autor: cortes madurados, fuego a la vista y carta de vinos larga.',
    plan: 'completo',
    estado: 'activa',
    direccion: 'Gorriti 5540',
    barrio: 'Palermo',
    lat: -34.586,
    lng: -58.434,
    rangoPrecio: 3,
    telefono: '+54 11 4776-0000',
    calificacion: 4.4,
    resenas: 389,
    cocinas: ['parrilla', 'asado'],
    horarios: clasico,
    carta: [
      { categoria: 'Parrilla', nombre: 'Ojo de bife madurado', descripcion: 'Veintiocho días de maduración.', precio: 28900, destacado: true, sinTacc: true },
      { categoria: 'Parrilla', nombre: 'Mollejas al limón', descripcion: 'Crocantes por fuera.', precio: 16400, sinTacc: true },
      { categoria: 'Guarniciones', nombre: 'Papas rústicas', descripcion: 'Con romero y ajo confitado.', precio: 7200, vegetariano: true, sinTacc: true },
    ],
  },
  {
    nombre: 'Verde Almacén',
    descripcion: 'Cocina vegetariana de estación y café de especialidad. Todo se hace en el día.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Thames 1620',
    barrio: 'Palermo',
    lat: -34.589,
    lng: -58.429,
    rangoPrecio: 2,
    telefono: '+54 11 4832-0000',
    calificacion: 4.6,
    resenas: 143,
    cocinas: ['vegetariano', 'cafe'],
    horarios: corrido,
    carta: [
      { categoria: 'Platos', nombre: 'Bowl de estación', descripcion: 'Cambia cada semana según la verdulería.', precio: 13400, vegetariano: true, destacado: true },
      { categoria: 'Platos', nombre: 'Tarta de puerro y ricota', descripcion: 'Masa integral hecha en casa.', precio: 10800, vegetariano: true },
      { categoria: 'Café', nombre: 'Flat white', descripcion: 'Blend de la casa, tueste medio.', precio: 4200, vegetariano: true, sinTacc: true },
    ],
  },
  {
    nombre: 'Pizzería La Cortada',
    descripcion: 'Pizza al molde de las de siempre, parado en la barra o para llevar.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Av. Corrientes 3210',
    barrio: 'Almagro',
    lat: -34.6035,
    lng: -58.4145,
    rangoPrecio: 1,
    telefono: '+54 11 4862-0000',
    calificacion: 4.3,
    resenas: 522,
    cocinas: ['pizza'],
    horarios: corrido,
    carta: [
      { categoria: 'Pizzas', nombre: 'Napolitana', descripcion: 'Rodajas de tomate y ajo.', precio: 12400, vegetariano: true, destacado: true },
      { categoria: 'Pizzas', nombre: 'Calabresa', descripcion: 'Con longaniza y morrón.', precio: 13800 },
    ],
  },
  {
    nombre: 'Sakura Villa Crespo',
    descripcion: 'Barra de sushi de doce lugares. Menú cerrado, pescado del día.',
    plan: 'completo',
    estado: 'activa',
    direccion: 'Aguirre 780',
    barrio: 'Villa Crespo',
    lat: -34.5975,
    lng: -58.4405,
    rangoPrecio: 3,
    telefono: '+54 11 4854-0000',
    calificacion: 4.5,
    resenas: 198,
    cocinas: ['sushi', 'japonesa'],
    horarios: clasico,
    carta: [
      { categoria: 'Barra', nombre: 'Omakase de 12 piezas', descripcion: 'Selección del itamae según lo que llegó del mercado.', precio: 32000, destacado: true, sinTacc: true },
      { categoria: 'Barra', nombre: 'Sashimi de salmón', descripcion: 'Cinco cortes.', precio: 14900, sinTacc: true },
    ],
  },
  {
    nombre: 'Café Recoleta 1890',
    descripcion: 'Café notable con vitrales originales. Desayunos largos y medialunas propias.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Junín 1620',
    barrio: 'Recoleta',
    lat: -34.5875,
    lng: -58.396,
    rangoPrecio: 2,
    telefono: '+54 11 4804-0000',
    calificacion: 4.2,
    resenas: 96,
    cocinas: ['cafe', 'bodegon'],
    horarios: corrido,
    carta: [
      { categoria: 'Desayuno', nombre: 'Café con leche y tres medialunas', descripcion: 'Las medialunas salen del horno a las siete.', precio: 5600, vegetariano: true, destacado: true },
      { categoria: 'Sándwiches', nombre: 'Tostado de jamón y queso', descripcion: 'En pan de miga, prensado.', precio: 6900 },
    ],
  },
  {
    nombre: 'Trattoria Fantasma',
    descripcion: 'Local dado de alta con la suscripción vencida. No debería figurar en los resultados.',
    plan: 'basico',
    estado: 'vencida',
    direccion: 'Honduras 4500',
    barrio: 'Palermo',
    lat: -34.5895,
    lng: -58.4275,
    rangoPrecio: 2,
    telefono: '+54 11 4833-0000',
    calificacion: 4.9,
    resenas: 12,
    cocinas: ['pastas', 'italiana'],
    horarios: clasico,
    carta: [],
  },
  {
    nombre: 'Sin Nombre Todavía',
    descripcion: 'Abrió hace dos semanas. Todavía no tiene ninguna reseña publicada.',
    plan: 'basico',
    estado: 'activa',
    direccion: 'Bolívar 640',
    barrio: 'San Telmo',
    lat: -34.6155,
    lng: -58.3735,
    rangoPrecio: 2,
    telefono: '+54 11 4300-0000',
    calificacion: null,
    resenas: 0,
    cocinas: ['pastas', 'casero'],
    horarios: clasico,
    carta: [
      { categoria: 'Principales', nombre: 'Fideos caseros del día', descripcion: 'Cambian todos los días según lo que haya.', precio: 12000, vegetariano: true, destacado: true },
    ],
  },
]
