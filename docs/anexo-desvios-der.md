# Anexo — Desvíos respecto del documento de análisis

Este anexo registra, de forma honesta, en qué se aparta la implementación del documento
*Proyecto Restaurantes v2 (Etapa 1)* y por qué. Sirve para que la documentación académica y el
código no se contradigan.

**Estado:** vigente al 5 de septiembre de 2026 · Fase A en desarrollo.

---

## 1. Marca

El documento no fija un nombre comercial. La plataforma se llama **RestoBA**, que es el nombre con
el que ya están redactados los cuatro documentos del marco legal (`legal/`). El nombre de la carpeta
del proyecto —*CATE APP WEB*— no es la marca.

---

## 2. Programa de fidelización: Puntos y Cupones

El documento, en el apartado 7.3 «Qué NO incluye», excluye expresamente el programa de fidelización.

**Se incluye igual.** El motivo es que el marco legal, redactado después del documento de análisis,
ya lo regula en detalle: el **Artículo 8 de los Términos y Condiciones** define la naturaleza de los
Puntos, su acumulación, canje y vigencia, y el **Acuerdo de Verificación** lo lista entre las
funciones que habilita el estado de Usuario Verificado. Sacarlo obligaría a reescribir dos
documentos legales; además es una de las diferencias frente a Morfy que el propio estudio de
mercado señala como oportunidad.

**Impacto en el modelo de datos:** tablas `movimiento_puntos` y `cupon`.

---

## 3. Método de pago de la suscripción

El documento menciona Mercado Pago como pasarela (apartados 7.2 y 8.4).

**No se usa ninguna pasarela.** El **Artículo 10 de los Términos y Condiciones** establece que los
Restaurantes Adheridos abonan la suscripción mensual **mediante transferencia bancaria directa, por
fuera de la Plataforma**, y que RestoBA no opera como procesador de pagos ni solicita, procesa o
almacena datos de tarjetas, CBU, CVU ni credenciales bancarias. La misma declaración se repite en la
Política de Privacidad y en el Anexo Técnico de Seguridad.

**Impacto en el modelo de datos:** tabla `suscripcion`, con período, monto, comprobante de
transferencia y fecha de acreditación manual. Un restaurante sin suscripción activa no aparece en el
buscador.

---

## 4. Niveles de acceso del comensal

El documento describe un único actor «Comensal» con todos los permisos.

El **Artículo 5 de los Términos y Condiciones** define **tres niveles**: Visitante, Usuario
Registrado y Usuario Verificado. Reservar, reseñar y acumular puntos requieren el nivel verificado,
que a su vez exige correo y teléfono confirmados más la aceptación de los tres documentos legales.

**Impacto en el modelo de datos:** tabla `aceptacion_legal` (el DDL está en `legal/README.md` y se
usa tal cual), y en `comensal` los campos `email_verificado`, `telefono_cifrado` y
`telefono_verificado`.

---

## 5. Favoritos

No figuran en el documento de análisis, pero sí en la matriz de niveles de acceso del Artículo 5,
como la función que distingue al Usuario Registrado del Visitante.

**Impacto en el modelo de datos:** tabla `favorito`.

---

## 6. Ubicación geográfica

El DER del documento guarda la posición del restaurante en dos columnas sueltas, `latitud` y
`longitud`.

Se reemplazan por una única columna `ubicacion geography(Point, 4326)` con índice GIST. Es lo que
permite resolver la cercanía con `ST_DWithin` y `ST_Distance` en la base, en lugar de calcular
distancias en la aplicación. Es el mismo dato, en el tipo que corresponde: sin esto, PostGIS —que el
documento sí exige— no aportaría nada.

---

## 7. Mapas

El documento no elige proveedor de mapas.

Se usa **Leaflet con teselas de OpenStreetMap**: no requiere clave de API, tarjeta de crédito ni
contrato, lo que es coherente con la factibilidad económica del proyecto y evita sumar un proveedor
más a la lista de terceros de la Política de Privacidad.

---

## 8. Lenguaje

El documento nombra JavaScript. Se usa **TypeScript** en el frontend y en el backend, con tipos y
esquemas de validación compartidos en `packages/shared`. Es el mismo ecosistema y las mismas
herramientas: solo agrega verificación en tiempo de compilación.

---

## 9. Base de datos en contenedor

El documento no dice cómo se instala PostgreSQL. Corre en **Docker** (imagen `postgis/postgis:16-3.4`),
para que los cinco integrantes trabajen contra exactamente la misma versión de PostgreSQL y PostGIS
sin instalar nada a mano.

---

## Lo que NO se desvía

Se respetan sin cambios: la arquitectura en tres capas, el stack (React / Node + Express /
PostgreSQL + PostGIS / Socket.IO), los nombres de todas las tablas del DER, los requerimientos
RF-01 a RF-12 y RNF-01 a RNF-06, los cuatro actores, los casos de uso y el orden de construcción del
diagrama de Gantt.
