/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El mapa de la aplicación: cada ruta es una pantalla.

   De un vistazo se ven las siete pantallas del lado del comensal y qué dirección
   abre cada una. Es el índice de toda la capa de presentación.

   ProveedorSesion las envuelve a todas: es lo que hace que cualquier pantalla
   sepa si hay alguien logueado y en qué nivel está, sin tener que preguntarlo
   cada una por su cuenta.

   Documento: apartado 15, capa de presentación.
   ════════════════════════════════════════════════════════════════════ */

import { BrowserRouter, Route, Routes } from 'react-router'
import { ProveedorSesion } from './lib/Sesion'
import { Carta } from './paginas/Carta'
import { Cuenta } from './paginas/Cuenta'
import { Ingresar } from './paginas/Ingresar'
import { Inicio } from './paginas/Inicio'
import { Perfil } from './paginas/Perfil'
import { Registro } from './paginas/Registro'
import { Resultados } from './paginas/Resultados'

export function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/buscar" element={<Resultados />} />
          <Route path="/restaurante/:id" element={<Perfil />} />
          <Route path="/restaurante/:id/carta" element={<Carta />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
