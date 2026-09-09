import { BrowserRouter, Route, Routes } from 'react-router'
import { ProveedorSesion } from './lib/Sesion'
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
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
