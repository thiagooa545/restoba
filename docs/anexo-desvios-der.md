# Anexo — Desvíos respecto del documento de análisis

Este anexo registra, de forma honesta, en qué se aparta la implementación del documento
*Proyecto Restaurantes v2 (Etapa 1)* y por qué. Sirve para que la documentación académica y el
código no se contradigan.

**Estado:** vigente al 18 de septiembre de 2026 · Fase A terminada · Fase B en desarrollo (panel del restaurante: carta, depósito y recetas).

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

Se usa **Leaflet** con el canvas gris claro de **Esri**, y OpenStreetMap como alternativa. Ninguno
de los dos requiere clave de API, tarjeta de crédito ni contrato, lo que es coherente con la
factibilidad económica del proyecto y evita sumar un proveedor más a la lista de terceros de la
Política de Privacidad. Se descartó CARTO porque desde 2025 estampa «API KEY REQUIRED» sobre sus
teselas gratuitas, y Google Maps porque exige tarjeta de crédito.

---

## 8. Lenguaje

El documento nombra JavaScript. Se usa **TypeScript** en el frontend y en el backend, con tipos y
esquemas de validación compartidos en `compartido`. Es el mismo ecosistema y las mismas
herramientas: solo agrega verificación en tiempo de compilación.

---

## 9. Base de datos en contenedor

El documento no dice cómo se instala PostgreSQL. Corre en **Docker** (imagen `postgis/postgis:16-3.4`),
para que los seis integrantes trabajen contra exactamente la misma versión de PostgreSQL y PostGIS
sin instalar nada a mano.

---

## 10. Personal del restaurante y sesiones

El DER prevé la tabla `usuario` para el personal del local, y se implementa con ese mismo nombre.
Se agregan dos cosas que el documento no detallaba:

- **`sesion` y `sesion_staff`.** El documento no define cómo se sostiene una sesión iniciada. El
  **Anexo Técnico de Seguridad** sí: token de acceso de 15 minutos y token de refresco en cookie
  `httpOnly` revocable. Para poder revocarlo hay que guardarlo, y por eso existen estas dos tablas,
  una por cada mundo de sesión. Un comensal no es empleado de ningún restaurante y un empleado no
  reserva mesas: son dos sesiones que no se cruzan, y el token lleva marcado de cuál se trata.
- **`horario`.** Las franjas de atención de cada local. El DER no las modela, pero sin ellas el
  buscador no puede decir si un restaurante está abierto, que es lo que el CU-01 muestra en la ficha
  de resultados. Un mismo día admite dos turnos —mediodía y noche—, por eso no hay unicidad por día.

---

## 11. Libro de movimientos de stock

El DER pide `stock_actual` en la tabla `ingrediente`, y ahí está, sin cambios. La tabla
`producto_ingrediente` también es la relación N:M que el DER ya preveía, con la cantidad viviendo en
la relación porque depende del par plato–ingrediente.

**Se agrega `movimiento_stock`**, que el DER no tenía. Con solo `stock_actual` se sabe cuánto hay
pero no por qué: si un martes faltan tres kilos de carne, la diferencia entre «se vendieron» y «se
perdieron» no se puede reconstruir. El libro guarda cada cambio con su motivo, su autor y el saldo
resultante.

Es el mismo criterio que ya se había aplicado a los puntos del comensal con `movimiento_puntos`: el
saldo es una consecuencia de los movimientos, no un número suelto que alguien edita a mano.

---

## 12. Tablas del DER todavía no construidas

Tres tablas del DER no están implementadas porque corresponden a etapas de la Fase B que aún no se
desarrollaron:

| Tabla | Etapa | Para qué |
|---|---|---|
| `pedido` | B3 · Pedidos y cocina en tiempo real | La comanda que el mozo envía a cocina |
| `detalle_pedido` | B3 | Qué platos y en qué cantidad lleva cada pedido |
| `venta` | B4 · Ventas y reportes | El cobro, con su método de pago |

No están descartadas: están en el plan y en el diagrama de Gantt. Cuando existan, son las que van a
descontar el stock automáticamente leyendo la receta de cada plato, que es para lo que se dejó
cargado `producto_ingrediente`.

---

## 13. Tabla técnica de control

`_migracion` no pertenece al modelo de negocio y no está en ningún DER. Es el registro de qué
archivos de migración ya se aplicaron, con un hash SHA-256 del contenido de cada uno, para detectar
si alguien modifica una migración ya ejecutada. Es control de configuración, no información del
dominio.

---

## Lo que NO se desvía

Se respetan sin cambios: la arquitectura en tres capas, el stack (React / Node + Express /
PostgreSQL + PostGIS / Socket.IO), los requerimientos RF-01 a RF-12 y RNF-01 a RNF-06, los cuatro
actores, los casos de uso y el orden de construcción del diagrama de Gantt.

**Sobre los nombres de las tablas:** las doce tablas del DER que ya están construidas conservan el
nombre exacto del documento —`restaurante`, `comensal`, `tipo_cocina`, `restaurante_tipo_cocina`,
`resena`, `usuario`, `mesa`, `reserva`, `categoria`, `producto`, `ingrediente` y
`producto_ingrediente`—. Ninguna se renombró. Las tres restantes del DER figuran en el punto 12, y
todo lo agregado está justificado en los puntos 2 a 13 de este anexo.
