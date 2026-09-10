/**
 * Comensales y reseñas de ejemplo.
 *
 * Las reseñas no son un número inventado en la tabla `restaurante`: cada una es
 * una fila con su reserva previa, como exige el art. 7.5. El promedio y el
 * total del local se calculan a partir de estas filas, así que lo que muestra
 * la pantalla es lo que hay en la base.
 */

export const COMENSALES = [
  { nombre: 'Martina G.', email: 'martina.g@ejemplo.ar' },
  { nombre: 'Julián R.', email: 'julian.r@ejemplo.ar' },
  { nombre: 'Carolina M.', email: 'carolina.m@ejemplo.ar' },
  { nombre: 'Diego P.', email: 'diego.p@ejemplo.ar' },
  { nombre: 'Sofía L.', email: 'sofia.l@ejemplo.ar' },
  { nombre: 'Nicolás F.', email: 'nicolas.f@ejemplo.ar' },
  { nombre: 'Valentina C.', email: 'valentina.c@ejemplo.ar' },
  { nombre: 'Tomás A.', email: 'tomas.a@ejemplo.ar' },
  { nombre: 'Camila B.', email: 'camila.b@ejemplo.ar' },
  { nombre: 'Federico S.', email: 'federico.s@ejemplo.ar' },
]

/** Contraseña de todos los comensales de ejemplo. Solo desarrollo. */
export const PASSWORD_DEMO = 'claveDePrueba2026'

type Comentario = { puntuacion: number; texto: string; respuesta?: string }

/**
 * Reseñas por restaurante, en el orden en que aparecen en semilla-datos.
 * Se reparten entre los comensales de arriba, uno distinto por reseña.
 */
export const RESENAS: Record<string, Comentario[]> = {
  'Cantina San Telmo': [
    {
      puntuacion: 5,
      texto: 'Fuimos un jueves a la noche sin reserva y esperamos veinte minutos parados en la escalera, pero valió la pena. Los sorrentinos con manteca y salvia son de otra época. Pedimos la provoleta para compartir y alcanzó para tres.',
      respuesta: 'Gracias Julián. Los jueves se nos llena temprano; si reservás por la app te guardamos la mesa del fondo.',
    },
    { puntuacion: 5, texto: 'La masa se nota que es del día. Los ravioles de verdura y ricota son los mejores que comí en el barrio y el precio es honesto para lo que sirven.' },
    { puntuacion: 4, texto: 'La comida impecable y los precios razonables para la zona. Le bajo un punto porque el salón es ruidoso y cuesta escuchar del otro lado de la mesa. Ideal para ir en grupo, no tanto para una cena tranquila.' },
    { puntuacion: 5, texto: 'Volví por tercera vez y nunca falla. El flan mixto es enorme, pedilo para compartir.' },
    { puntuacion: 5, texto: 'Atención muy amable, nos explicaron cada salsa sin apuro. Se nota el laburo de años.' },
    { puntuacion: 4, texto: 'Muy bueno todo, aunque los ñoquis me llegaron un poco fríos. Lo dije y los cambiaron sin problema.' },
    { puntuacion: 5, texto: 'El lugar tiene alma. Sótano de ladrillo, mesas largas, y una carta corta que hacen bien. Ojalá no cambien nada.' },
    { puntuacion: 3, texto: 'La pasta bien, pero fuimos un sábado a las nueve y tardaron cuarenta minutos en tomarnos el pedido. Entiendo que estaba lleno, igual se hizo largo.' },
  ],
  'Il Gattopardo': [
    { puntuacion: 5, texto: 'El tagliatelle al ragú justifica el precio. Ocho horas de cocción se sienten. Salón chico y tranquilo, se puede conversar.' },
    { puntuacion: 5, texto: 'Reservamos con una semana de anticipación y valió la pena. El risotto de hongos estaba en su punto exacto.' },
    { puntuacion: 4, texto: 'Muy buena cocina, pero las porciones son chicas para lo que sale. Salimos conformes, no llenos.' },
    { puntuacion: 5, texto: 'La panna cotta con frutos rojos fue el mejor postre del año. Pedí la receta y se rieron.' },
    { puntuacion: 4, texto: 'Ambiente lindo y comida muy cuidada. Solo doce mesas, así que sin reserva es difícil.' },
    { puntuacion: 5, texto: 'Nos festejaron el aniversario con una copa de espumante de la casa. Detalles que se agradecen.' },
  ],
  'La Rambla de Chacarita': [
    { puntuacion: 5, texto: 'Fuimos un 29 por los ñoquis y terminamos pidiendo parrilla también. El bife de chorizo es enorme y sale a punto si lo pedís.' },
    { puntuacion: 5, texto: 'Ideal para ir en banda. Somos ocho y nos sentaron sin drama. La entraña con chimichurri es un golazo.' },
    { puntuacion: 4, texto: 'La carne muy bien, las pastas correctas. Es ruidoso y no hay forma de que no lo sea, es parte del lugar.' },
    { puntuacion: 5, texto: 'Precio muy razonable para la cantidad que sirven. La jarra de vino de la casa cumple.' },
    { puntuacion: 4, texto: 'Buenísimo todo, aunque el postre de queso y dulce era una porción industrial. Alcanza para dos.' },
    { puntuacion: 5, texto: 'De los últimos bodegones de verdad que quedan. Espero que aguante.' },
    { puntuacion: 5, texto: 'Mozos de los de antes, con delantal y memoria. No anotan nada y no se equivocan.' },
  ],
  'Doña Petrona': [
    { puntuacion: 5, texto: 'La milanesa a caballo es del tamaño del plato y sale menos que un menú del centro. Comida de casa, sin vueltas.' },
    { puntuacion: 4, texto: 'Los canelones de verdura muy ricos. El lugar es sencillo, mesas de fórmica, pero está impecable.' },
    { puntuacion: 5, texto: 'Vamos al mediodía con los del trabajo y siempre salimos contentos. El budín de pan con dulce de leche cierra bien.' },
    { puntuacion: 4, texto: 'Muy buena relación precio calidad. A veces se llena y hay que esperar en la vereda.' },
    { puntuacion: 5, texto: 'Cocina honesta. Nada de emplatados raros: comida rica y abundante.' },
  ],
  'El Preferido de Boedo': [
    { puntuacion: 5, texto: 'La fugazzeta rellena es de las mejores de Buenos Aires. Mucha cebolla, mucha muzza, al molde como corresponde.' },
    { puntuacion: 4, texto: 'Buena pizza y buen vermú en la barra. El salón es chico y a la noche se complica sentarse.' },
    { puntuacion: 5, texto: 'Pedimos porción de fugazzeta y fainá arriba. Clásico que nunca falla.' },
    { puntuacion: 4, texto: 'Rico todo, aunque la muzzarella podría tener un poco más de queso.' },
    { puntuacion: 5, texto: 'Atención rápida y amable. Fuimos con dos nenes y no hubo problema.' },
    { puntuacion: 4, texto: 'De barrio, de los buenos. Precio justo.' },
  ],
  'Brasa y Sal': [
    { puntuacion: 5, texto: 'El ojo de bife madurado veintiocho días es otra cosa. Caro, sí, pero se entiende por qué.' },
    { puntuacion: 4, texto: 'Las mollejas al limón estaban perfectas. La carta de vinos es larguísima, pedí ayuda al sommelier y acertó.' },
    { puntuacion: 4, texto: 'Muy buena carne y buen servicio. El precio es alto incluso para Palermo.' },
    { puntuacion: 5, texto: 'Fuimos a festejar un ascenso y salió redondo. El fuego a la vista suma mucho.' },
    { puntuacion: 3, texto: 'La carne bien, pero nos sentaron al lado de la parrilla y salimos con olor a humo hasta en la mochila.' },
    { puntuacion: 5, texto: 'Las papas rústicas con romero son un acompañamiento aparte. Pedí dos.' },
  ],
  'Verde Almacén': [
    { puntuacion: 5, texto: 'El bowl de estación cambia todas las semanas y siempre está bueno. Se nota que compran en la verdulería de al lado.' },
    { puntuacion: 5, texto: 'El latte de especias con leche de almendras es mi desayuno de los sábados. El lugar es chiquito y luminoso.' },
    { puntuacion: 4, texto: 'Muy rica la tarta de puerro. El licuado verde es más sano que sabroso, pero cumple.' },
    { puntuacion: 5, texto: 'Por fin un lugar vegetariano que no es solo ensaladas. La milanesa de berenjena está buenísima.' },
    { puntuacion: 4, texto: 'Buen café y buena atención. A la mañana se llena y hay que esperar mesa.' },
  ],
  'Pizzería La Cortada': [
    { puntuacion: 4, texto: 'Pizza al molde de la de siempre. La napolitana con mucho ajo, como tiene que ser.' },
    { puntuacion: 5, texto: 'Barata, rápida y rica. Comés parado en la barra en quince minutos.' },
    { puntuacion: 4, texto: 'La calabresa tiene buena longaniza. El local es básico pero limpio.' },
    { puntuacion: 4, texto: 'Cumple perfecto para llevar. Siempre hay cola a las nueve.' },
    { puntuacion: 5, texto: 'Precio imbatible sobre Corrientes. Un clásico de Almagro.' },
    { puntuacion: 4, texto: 'Buena masa, aunque a veces le falta un poco de horno.' },
  ],
  'Sakura Villa Crespo': [
    { puntuacion: 5, texto: 'El omakase de doce piezas vale cada peso. El itamae explica cada corte y el pescado es del día.' },
    { puntuacion: 5, texto: 'Barra de doce lugares, así que se siente íntimo. Reservá con tiempo.' },
    { puntuacion: 4, texto: 'Muy buen sushi, de lo mejor de la zona. El precio es elevado pero acorde.' },
    { puntuacion: 4, texto: 'El sashimi de salmón impecable. Me hubiera gustado más variedad en el menú fijo.' },
    { puntuacion: 5, texto: 'Fuimos por recomendación y no defraudó. Nada de rolls con queso crema, sushi en serio.' },
  ],
  'Café Recoleta 1890': [
    { puntuacion: 4, texto: 'Los vitrales originales valen la visita. Las medialunas salen tibias a la mañana temprano.' },
    { puntuacion: 4, texto: 'Café con leche y tres medialunas a buen precio para la zona. El servicio es lento cuando se llena.' },
    { puntuacion: 5, texto: 'El submarino con la barrita de chocolate es un viaje a la infancia. Volvería solo por eso.' },
    { puntuacion: 4, texto: 'Lindo lugar para leer un rato. El tostado de jamón y queso está bien prensado.' },
    { puntuacion: 3, texto: 'El café estaba frío y tardaron en cambiarlo. El lugar es hermoso, la atención no acompañó ese día.' },
  ],
}
