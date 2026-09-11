/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El punto de entrada de las definiciones que comparten las dos puntas.

   Un mismo dato viaja del navegador a la API y de la API a la base. Si cada lado
   lo describiera por su cuenta, tarde o temprano se contradicen: el frontend
   manda «telefono» y el backend espera «telefonoUsuario», y el error aparece
   recién cuando el usuario aprieta el botón.

   Acá se describe una sola vez y las dos puntas importan lo mismo. Es lo que
   permite que la capa de presentación y la de lógica hablen sin malentendidos.

   Documento: apartado 15, arquitectura en tres capas.
   ════════════════════════════════════════════════════════════════════ */

export * from './auth.js'
export * from './legal.js'
export * from './restaurantes.js'
export * from './reservas.js'
export * from './resenas.js'
