# RestoBA

Plataforma web para descubrir y gestionar restaurantes. Los comensales buscan por tipo de comida y
ven los resultados por cercanía y reseñas; los restaurantes acceden a un sistema de gestión bajo
suscripción mensual (SaaS, B2B).

Proyecto académico. Metodología en cascada con enfoque SQA.

---

## Cómo levantarlo

Necesitás **Node 22 o superior**, **Docker Desktop** corriendo y **Git**. No hace falta instalar
PostgreSQL: corre en un contenedor.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run db:up             # levanta PostgreSQL 16 + PostGIS 3.4
npm run db:migrate        # aplica las migraciones
npm run dev               # API en :4000 y web en :5173
```

Abrí <http://localhost:5173>. La pantalla de arranque muestra si la API y PostGIS responden.

> La primera vez, `db:migrate` puede fallar con *Connection terminated unexpectedly*: PostgreSQL se
> reinicia una vez al terminar de inicializarse. Volvé a correrlo y anda.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y la web juntas |
| `npm run dev:api` / `npm run dev:web` | Una sola de las dos |
| `npm run build` | Compila ambas para producción |
| `npm run typecheck` | Verifica tipos en los tres paquetes |
| `npm run db:up` / `npm run db:down` | Prende y apaga la base |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:reset` | Borra el esquema y reaplica todo **(se pierden los datos)** |
| `npm run db:logs` | Sigue el log de PostgreSQL |

---

## Estructura

```
apps/api/          Capa de lógica — Node + Express + PostgreSQL/PostGIS
apps/web/          Capa de presentación — React + Vite + Tailwind
packages/shared/   Tipos y esquemas Zod compartidos entre las dos
infra/             docker-compose y migraciones SQL numeradas
legal/             Marco legal. Fuente de verdad: la app lo renderiza, no lo copia
design/            Maqueta de la Fase A (artboards del canvas de diseño)
docs/              Anexos, incluido el registro de desvíos respecto del análisis
```

Las migraciones se aplican en orden alfabético y quedan registradas en la tabla `_migracion` con el
hash del archivo. **Una migración ya aplicada no se edita**: se crea una nueva.

---

## Sistema de diseño

Los tokens viven en [`apps/web/src/estilos/tokens.css`](apps/web/src/estilos/tokens.css) y salen del
marco legal ya publicado. Papel cálido `#FCFBF9`, tinta `#1B1C21`, y tres acentos: vino `#7C2239`,
verde `#1C6350` y ámbar `#815214`. Tipografías: **Petrona** para títulos, **Archivo** para interfaz,
**IBM Plex Mono** para datos.

Radios: 12 px en botones, 14 px en paneles, 4 px en chips de dato. Separación por reglas de 1 px, no
por sombras. Sin neón, glassmorphism ni degradés multicolor.

El papel cálido es la identidad, así que se ve por defecto sin importar cómo tenga el sistema el
usuario. El modo oscuro existe pero es una elección explícita:
`document.documentElement.dataset.theme = 'dark'`.

## Mapas

**No hace falta ninguna clave de API.** Se usa Leaflet con teselas de CARTO (claras, las que combinan
con el diseño) y, como alternativa, las de OpenStreetMap. Se cambia con `VITE_MAPA_PROVEEDOR=osm` en
el `.env`. Ninguno de los dos pide registro ni tarjeta: por eso se descartó Google Maps.

La maqueta navegable de las pantallas está en `design/` y publicada como canvas de diseño.

---

## Seguridad

Los parámetros de `.env` no son arbitrarios: están **declarados en un documento legal**
([Anexo Técnico de Seguridad](legal/04-anexo-tecnico-seguridad.md)). bcrypt con costo 12, JWT de
acceso de 15 minutos, AES-256-GCM sobre el teléfono. Si alguno cambia, hay que corregir el documento.

**Los secretos van solo en `.env`**, que está en `.gitignore` y nunca se versiona.

---

## Pagos

La plataforma **no procesa pagos**. Los restaurantes abonan la suscripción por **transferencia
bancaria directa, fuera de la plataforma** (Términos y Condiciones, art. 10). No hay pasarela ni se
almacenan datos de tarjeta, CBU o CVU.

---

## Estado

- [x] **A0 · Fundaciones** — repo, workspaces, Docker con PostGIS, tokens del sistema de diseño
- [x] **A2** — Buscador, cercanía con PostGIS, mapa y perfil del restaurante
- [ ] **A1** — Autenticación, roles y pantalla de aceptación del marco legal
- [ ] **A3** — Reseñas, favoritos, puntos y cupones
- [ ] **A4** — Reservas
- [ ] **Fase B** — Panel del restaurante, cocina en tiempo real, inventario, dashboard y suscripción

Los desvíos respecto del documento de análisis están registrados en
[`docs/anexo-desvios-der.md`](docs/anexo-desvios-der.md).
