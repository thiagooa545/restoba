/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El mapa de la aplicación: cada ruta es una pantalla.

   De un vistazo se ven las siete pantallas del lado del comensal y las del panel
   del restaurante, con la dirección que abre cada una. Es el índice de toda la
   capa de presentación.

   Las rutas de /gestion cuelgan de su propio marco: tienen otra sesión (el
   personal del local, no el comensal) y no comparten el encabezado.

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
import { Inventario } from './paginas/gestion/Inventario'
import { MarcoGestion } from './paginas/gestion/Panel'
import { Recetas } from './paginas/gestion/Recetas'

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

          {/* El panel del restaurante. Va colgado de /gestion y con su propio
              marco: otra sesión, otras pantallas, el mismo servidor. */}
          <Route path="/gestion" element={<MarcoGestion />}>
            <Route index element={<Inventario />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="recetas" element={<Recetas />} />
          </Route>

          <Route path="*" element={<Inicio />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
