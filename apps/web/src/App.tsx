import { BrowserRouter, Route, Routes } from 'react-router'
import { Inicio } from './paginas/Inicio'
import { Perfil } from './paginas/Perfil'
import { Resultados } from './paginas/Resultados'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/buscar" element={<Resultados />} />
        <Route path="/restaurante/:id" element={<Perfil />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  )
}
