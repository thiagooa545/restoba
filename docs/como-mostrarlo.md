# Cómo mostrar el proyecto en otra computadora

Guía para llevar RestoBA en un pendrive y hacerlo andar en una máquina que no es la tuya.

---

## Lo primero: leé esto antes de confiar en el pendrive

El proyecto necesita **Docker Desktop** para la base de datos, y Docker en Windows pide permisos de
administrador, WSL2 y un reinicio para instalarse. **En una computadora del colegio eso casi nunca
se puede.**

Por eso, en orden de qué tan seguro es:

| Plan | Qué hacés | Riesgo |
|---|---|---|
| **A** | Llevás **tu propia notebook** con todo andando | Ninguno |
| **B** | Pendrive a una máquina que **ya tenga** Docker y Node instalados | Bajo |
| **C** | Pendrive a una máquina sin nada instalado | **Alto** — no vas a poder instalar Docker sin admin |

Si podés llevar tu notebook, llevala. Si no, averiguá **hoy** si la máquina del colegio tiene Docker
Desktop, porque si no lo tiene no hay forma de levantar la base ahí.

---

## Plan A — Tu propia notebook

Ya está todo. Abrí una terminal en la carpeta del proyecto y corré:

```bash
npm start
```

Eso levanta la base, aplica las migraciones, carga los datos de ejemplo si hacen falta y arranca la
API y la web. Después abrís <http://localhost:5173>.

Para cortar: `Ctrl+C`.

---

## Plan B — Pendrive a una máquina con Docker y Node

### Antes de salir de tu casa

1. **Empaquetá la imagen de la base** para no depender del wifi del colegio:

   ```bash
   npm run pack:offline
   ```

   Deja `infra/postgis-16-3.4.tar` (unos 400 MB). `npm start` la carga sola si no encuentra la
   imagen descargada.

2. **Copiá la carpeta entera al pendrive**, incluida `node_modules`.

   > Esto es importante: sin internet no vas a poder correr `npm install`, y `node_modules` pesa
   > bastante pero es lo que hace que el proyecto arranque sin descargar nada. Copiá de Windows a
   > Windows; entre sistemas operativos distintos no sirve.

3. Verificá que en el pendrive estén: `apps/`, `packages/`, `infra/`, `node_modules/`,
   `package.json` y el `.env`. Si el `.env` no está, `npm start` lo crea solo desde el ejemplo.

### En el colegio

1. Abrí **Docker Desktop** y esperá a que diga *Engine running*.
2. Copiá la carpeta del pendrive **al disco de la máquina** (correrlo desde el pendrive anda pero es
   lento).
3. Abrí una terminal ahí y:

   ```bash
   npm start
   ```

4. Abrí <http://localhost:5173>.

---

## Qué necesita estar instalado

| Programa | Versión | Para qué | Cómo saber si está |
|---|---|---|---|
| **Node.js** | 22 o superior | Correr la API y la web | `node -v` |
| **Docker Desktop** | Cualquiera reciente | La base de datos con PostGIS | `docker --version` |
| **Un navegador** | Chrome, Edge o Firefox actual | Ver la página | — |

Git **no** hace falta para mostrarlo, solo para trabajar en el código.

`npm start` chequea las dos cosas antes de arrancar y te dice cuál falta, así que si algo no está lo
vas a ver enseguida y no te va a explotar en la cara delante del curso.

---

## Cosas que sí necesitan internet

- **El mapa.** Las teselas se bajan de Esri. Sin internet el mapa sale gris, aunque los resultados,
  las distancias y todo lo demás siguen funcionando: las distancias las calcula PostGIS en la base,
  no el mapa.
- **Las tipografías.** Petrona y Archivo vienen de Google Fonts. Sin internet la página se ve con
  las tipografías de respaldo (Georgia y Segoe UI): se lee bien, pero pierde parte de la identidad.

Si el colegio no tiene wifi, **compartí datos desde el celular**. Con eso alcanza.

---

## Si algo falla

| Qué ves | Qué pasó | Cómo se arregla |
|---|---|---|
| `No encontré Docker` | No está instalado | No hay vuelta sin permisos de administrador. Plan A. |
| `Docker está instalado pero el motor no responde` | Docker Desktop cerrado | Abrilo y esperá a que diga *Engine running* |
| `Faltan las dependencias` | No se copió `node_modules` | Con internet: `npm install`. Sin internet: traela del pendrive |
| `La base no respondió a tiempo` | El contenedor no arrancó | `npm run db:logs` para ver el error |
| El mapa sale gris | Sin internet | Compartí datos del celular |
| El puerto 5173 o 4000 está ocupado | Otro programa lo usa | Cerrá lo que esté corriendo, o cambiá `API_PORT` en el `.env` |

---

## Qué mostrar (guion de tres minutos)

1. **Portada.** Escribí *pastas* y tocá **Usar mi ubicación** → *Buscar*.
2. **Resultados.** Señalá que las distancias son reales: las calcula PostGIS con `ST_Distance` sobre
   coordenadas verdaderas de la Ciudad. Pasá el mouse por una ficha y mostrá cómo se resalta el pin.
3. **Cambiá el orden** entre *Cercanía* y *Puntaje*. Mostrá que **Sin Nombre Todavía**, que no tiene
   ninguna reseña, no rompe el orden — es uno de los casos de prueba del documento de análisis.
4. **Buscá "Fantasma".** No aparece nada: ese local existe en la base pero tiene la suscripción
   vencida. La regla del modelo de negocio vive en la consulta SQL, no en la pantalla.
5. **Buscá "bodegon"** sin acento y aparecen los bodegones.
6. **Entrá a un perfil** y mostrá la carta con precios y las marcas de sin TACC y vegetariano.
7. Si buscás algo lejano, aparece el aviso de que **se amplió el radio** automáticamente: es el flujo
   alternativo del caso de uso CU-01.
