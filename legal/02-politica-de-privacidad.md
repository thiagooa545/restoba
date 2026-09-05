# Política de Privacidad — RestoBA

**Versión:** 1.0
**Vigencia desde:** 29 de agosto de 2026
**Última actualización:** 29 de agosto de 2026
**Documento:** `privacidad`

> Esta Política explica qué datos personales recolectamos, para qué los usamos, cuánto tiempo los
> conservamos, con quién los compartimos y cómo podés controlarlos. Está redactada conforme la
> **Ley 25.326 de Protección de los Datos Personales**, su Decreto Reglamentario 1558/2001 y las
> disposiciones de la Agencia de Acceso a la Información Pública (AAIP).
>
> Las medidas técnicas concretas que protegen estos datos se detallan en el
> [Anexo Técnico de Seguridad](04-anexo-tecnico-seguridad.md).

---

## 1. Responsable del tratamiento

| | |
|---|---|
| **Responsable** | `[COMPLETAR: razón social]` |
| **CUIT** | `[COMPLETAR]` |
| **Domicilio** | `[COMPLETAR]`, Ciudad Autónoma de Buenos Aires, Argentina |
| **Contacto de privacidad** | `[COMPLETAR: privacidad@restoba.com.ar]` |
| **Registro de base de datos** | Inscripción ante el Registro Nacional de Bases de Datos de la AAIP — N.º `[COMPLETAR]` |

La inscripción de la base de datos ante la AAIP es obligatoria conforme el artículo 21 de la
Ley 25.326 y debe completarse antes de la puesta en producción de la Plataforma.

---

## 2. Qué datos recolectamos

Los datos que se detallan a continuación se corresponden con las entidades reales del modelo de
datos de la Plataforma.

### 2.1. Datos que nos proporcionás al registrarte

| Dato | Entidad | Obligatorio | Por qué lo pedimos |
|---|---|:---:|---|
| Nombre y apellido | `Comensal` | Sí | Identificarte en la reserva y en tus reseñas |
| Correo electrónico | `Comensal` | Sí | Iniciar sesión, confirmar reservas, recuperar la contraseña |
| Contraseña | `Comensal` | Sí | Autenticarte. **Se almacena como hash irreversible, nunca en texto legible** |
| Teléfono | `Comensal` | Solo para verificarte | Confirmar tu identidad por código y permitir que el restaurante te contacte ante un cambio en la reserva |
| Fecha de nacimiento | `Comensal` | Solo para verificarte | Acreditar que sos mayor de 18 y emitir el cupón de cumpleaños |
| Foto de perfil | `Comensal` | No | Mostrarla junto a tus reseñas, si decidís cargarla |

### 2.2. Datos que se generan por tu uso de la Plataforma

| Dato | Entidad |
|---|---|
| Reservas: restaurante, mesa, fecha, hora, cantidad de personas, estado | `Reserva` |
| Pedidos y su detalle: productos, cantidades, importes | `Pedido`, `DetallePedido` |
| Reseñas: texto, puntuación, fecha, restaurante reseñado | `Reseña` |
| Movimientos de puntos: acreditaciones, canjes, vencimientos y saldo | `MovimientoPuntos` |
| Cupones emitidos, su tipo, vencimiento y estado de uso | `Cupon` |
| Restaurantes marcados como favoritos y filtros de búsqueda guardados | `Comensal` |

### 2.3. Datos de verificación

Correo confirmado (marca temporal), teléfono confirmado (marca temporal), código de un solo uso
enviado por SMS o correo —que **se descarta apenas es validado o vence**— y la constancia de
aceptación del marco legal descripta en la sección 8.

### 2.4. Datos de geolocalización

Si activás la búsqueda por proximidad, tu navegador nos envía tus coordenadas aproximadas.
Se usan **en el momento** para ejecutar la consulta geográfica con PostGIS y devolverte los
restaurantes cercanos. **No conservamos un historial de tus ubicaciones**: la coordenada no se
persiste en la base de datos ni se asocia a tu perfil. El permiso es opcional, se te solicita de
forma explícita y podés revocarlo desde la configuración de tu navegador en cualquier momento; la
Plataforma sigue funcionando sin él, buscando por barrio o dirección ingresada manualmente.

### 2.5. Datos técnicos

Dirección IP, tipo de navegador y sistema operativo (*user-agent*), fecha y hora de acceso,
páginas visitadas dentro de la Plataforma y registros de error. Se usan para operar el servicio,
detectar fraudes y abusos, y diagnosticar problemas.

### 2.6. Qué NO recolectamos

De forma expresa, la Plataforma **no solicita, no procesa y no almacena**:

- **Datos de tarjetas de crédito o débito, CBU, CVU ni credenciales bancarias.** La Plataforma no
  procesa pagos. El comensal no paga nada, y la suscripción de los restaurantes se cobra por
  transferencia bancaria directa, por fuera del sistema.
- **Datos sensibles** en los términos del artículo 2 de la Ley 25.326: origen racial o étnico,
  opiniones políticas, convicciones religiosas o filosóficas, afiliación sindical, y datos
  referidos a la salud o a la vida sexual. Si mencionás alguno de estos aspectos por tu cuenta en
  el texto de una reseña, lo hacés voluntariamente y bajo tu responsabilidad; podés pedir su
  eliminación en cualquier momento.
- **Datos biométricos**: no usamos reconocimiento facial, huella dactilar ni voz.
- **Número de documento**, salvo que en el futuro una obligación legal lo exija, lo que se
  comunicaría previamente.

---

## 3. Para qué usamos tus datos, con qué base legal y por cuánto tiempo

| Dato | Finalidad | Base legal | Conservación |
|---|---|---|---|
| Nombre, email, contraseña | Crear y operar tu cuenta | Consentimiento (art. 5 Ley 25.326) y ejecución del servicio | Mientras la cuenta esté activa |
| Teléfono | Verificación por código y contacto ante cambios en la reserva | Consentimiento explícito al verificarte | Mientras conserves el estado de verificado |
| Fecha de nacimiento | Acreditar mayoría de edad y emitir el cupón de cumpleaños | Consentimiento y cumplimiento del art. 3 de los Términos | Mientras la cuenta esté activa |
| Reservas y pedidos | Prestar el servicio de reserva y calcular puntos | Ejecución del servicio | 24 meses desde la fecha del evento |
| Reseñas | Publicarlas para la comunidad | Consentimiento al publicar | Indefinida, anonimizada si das de baja la cuenta |
| Movimientos de puntos y cupones | Operar el programa de fidelización y permitir auditar tu saldo | Ejecución del servicio | 24 meses desde el movimiento |
| Geolocalización | Búsqueda por proximidad | Consentimiento explícito y revocable | **No se persiste** — se usa solo en la consulta |
| IP, user-agent, logs | Seguridad, detección de fraude, diagnóstico | Interés legítimo en la seguridad del servicio | 12 meses |
| Constancia de aceptación legal | Acreditar tu consentimiento informado | Obligación de prueba del consentimiento | 5 años desde la baja de la cuenta |
| Copias de respaldo | Recuperación ante incidentes | Seguridad del servicio | 30 días de rotación |

Cumplidos los plazos, los datos se eliminan o se anonimizan de forma irreversible.

**Nota sobre las copias de respaldo:** cuando solicitás la supresión de tus datos, estos se
eliminan de inmediato del sistema en producción, pero pueden persistir hasta 30 días adicionales
en las copias de respaldo cifradas hasta que estas roten. Durante ese período no se utilizan para
ninguna finalidad y solo serían accesibles en caso de una restauración por desastre.

---

## 4. Con quién compartimos tus datos

### 4.1. Restaurantes Adheridos

Cuando reservás o pedís en un establecimiento, este recibe **únicamente los datos necesarios para
atenderte**: tu nombre, la fecha, la hora, la cantidad de personas y, si lo verificaste, tu
teléfono de contacto. El restaurante **no accede** a tu correo electrónico, a tu historial en
otros establecimientos, a tu saldo de puntos global ni a tus datos de cuenta. Cada Restaurante
Adherido es responsable del uso que haga de esa información en su propio ámbito.

### 4.2. Proveedores de infraestructura

Trabajamos con proveedores que actúan como encargados del tratamiento y solo pueden usar los datos
para prestarnos el servicio contratado:

| Proveedor | Servicio | Datos alcanzados |
|---|---|---|
| `[COMPLETAR: Render / Railway / DigitalOcean]` | Servidor y base de datos | Todos los datos de la Plataforma |
| `[COMPLETAR: proveedor de correo transaccional]` | Envío de confirmaciones y códigos | Nombre y correo electrónico |
| `[COMPLETAR: proveedor de SMS]` | Envío de códigos de verificación | Teléfono |

### 4.3. Autoridades

Ante un requerimiento judicial o de autoridad competente debidamente fundado, y en la medida
estrictamente exigida por ese requerimiento.

### 4.4. Lo que nunca hacemos

**No vendemos, alquilamos ni cedemos tus datos personales a terceros con fines comerciales o
publicitarios.** No los utilizamos para entrenar modelos de inteligencia artificial. No los
compartimos con redes sociales ni con corredores de datos.

---

## 5. Transferencia internacional de datos

La infraestructura de la Plataforma se aloja en un servidor virtual cuyo centro de datos puede
encontrarse **fuera de la República Argentina** (por ejemplo, en los Estados Unidos o en la Unión
Europea, según el proveedor y la región contratada).

Conforme el artículo 12 de la Ley 25.326, te informamos de esta circunstancia y dejamos constancia
de que:

- se contratan proveedores que ofrecen niveles de protección adecuados, con cláusulas
  contractuales de confidencialidad y seguridad;
- los datos viajan cifrados en tránsito y se almacenan cifrados en reposo;
- al aceptar esta Política prestás tu consentimiento informado para esa transferencia.

Región contratada actualmente: `[COMPLETAR]`.

---

## 6. Tus derechos sobre tus datos

Como titular de los datos, la Ley 25.326 te reconoce los siguientes derechos:

| Derecho | Qué podés hacer | Plazo de respuesta |
|---|---|---|
| **Acceso** (art. 14) | Pedir una copia de todos los datos que tenemos sobre vos | **10 días corridos** |
| **Rectificación** (art. 16) | Corregir datos inexactos | **5 días hábiles** |
| **Actualización** (art. 16) | Poner al día datos desactualizados | **5 días hábiles** |
| **Supresión** (art. 16) | Pedir que borremos tus datos, con los límites de la sección 3 | **5 días hábiles** |
| **Revocación del consentimiento** | Retirar el consentimiento para un tratamiento determinado, como la geolocalización o el estado de verificado | Inmediato |
| **Portabilidad** | Recibir tus datos en un formato estructurado y legible por máquina (JSON) | 10 días corridos |

**Cómo ejercerlos:** desde *Mi perfil → Mis datos* en la Plataforma, o escribiendo a
`[COMPLETAR: privacidad@restoba.com.ar]` desde la dirección de correo registrada en tu cuenta. Si
escribís desde otra dirección, podremos pedirte una acreditación razonable de identidad antes de
responder.

### Leyendas obligatorias (Disposición AAIP 10/2008)

> *"El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
> mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
> interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la
> Ley N.º 25.326."*

> *"La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la
> Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con
> relación al incumplimiento de las normas sobre protección de datos personales."*

---

## 7. Cookies y almacenamiento local

La Plataforma utiliza el almacenamiento del navegador con estos fines:

| Tipo | Para qué | ¿Se puede desactivar? |
|---|---|---|
| **Técnicas / de sesión** | Mantener tu sesión iniciada (token de autenticación) y recordar preferencias de interfaz | No — sin ellas no podés iniciar sesión |
| **De preferencia** | Recordar filtros de búsqueda, tema claro u oscuro | Sí, desde tu navegador |
| **Analíticas** | `[COMPLETAR: indicar la herramienta de analítica utilizada; si no se usa ninguna, dejar constancia expresa]` | Sí |

**No utilizamos cookies publicitarias ni de seguimiento entre sitios.** Podés borrar el
almacenamiento local desde tu navegador en cualquier momento; eso cerrará tu sesión.

---

## 8. Cómo registramos tu consentimiento

Cada vez que aceptás un documento del marco legal, guardamos una constancia con: tu identificador
de usuario, qué documento aceptaste, en qué versión, la fecha y hora en UTC, tu dirección IP, tu
user-agent y el **hash SHA-256 del texto exacto que se te exhibió**. Ese hash permite demostrar,
años después, cuál era el contenido literal que aceptaste, sin necesidad de confiar en la memoria
de nadie.

El consentimiento se recoge mediante una casilla que **no viene pre-marcada** y solo después de
mostrarte el documento completo. El detalle del procedimiento está en el
[Acuerdo de Verificación de Usuario](03-acuerdo-de-verificacion.md), sección 6.

---

## 9. Seguridad de la información

Aplicamos medidas técnicas y organizativas para proteger tus datos contra el acceso no autorizado,
la alteración, la pérdida y el tratamiento no permitido, conforme el artículo 9 de la Ley 25.326.

Entre ellas: cifrado de las comunicaciones con TLS, almacenamiento de contraseñas mediante hash
irreversible con sal, cifrado de las copias de respaldo, control de acceso por roles, registro de
auditoría y protecciones contra los ataques más comunes en aplicaciones web.

El detalle completo, con los algoritmos y parámetros concretos, está en el
[Anexo Técnico de Seguridad](04-anexo-tecnico-seguridad.md).

**Ningún sistema es invulnerable.** Si detectamos un incidente que afecte tus datos personales, te
lo notificaremos por correo electrónico dentro de las **72 horas** de confirmado, informándote qué
datos se vieron comprometidos y qué medidas podés tomar, y daremos aviso a la AAIP.

---

## 10. Menores de edad

La Plataforma está destinada a personas mayores de 18 años. No recolectamos deliberadamente datos
de menores. Si tomamos conocimiento de que una cuenta pertenece a una persona menor de edad,
procederemos a darla de baja y a eliminar sus datos. Si sos madre, padre o tutor y creés que un
menor a tu cargo nos proporcionó datos, escribinos a `[COMPLETAR: privacidad@restoba.com.ar]`.

---

## 11. Cambios en esta Política

Podemos actualizar esta Política. Los cambios se notifican al correo registrado y se anuncian en
la Plataforma con **10 días corridos** de anticipación. Si el cambio implica una finalidad nueva o
sustancialmente distinta para tus datos, te pediremos un consentimiento nuevo y expreso: el
silencio no se interpretará como aceptación.

Las versiones anteriores quedan archivadas y disponibles para consulta.

---

## 12. Contacto y reclamos

| Motivo | Canal |
|---|---|
| Ejercicio de derechos y consultas de privacidad | `[COMPLETAR: privacidad@restoba.com.ar]` |
| Reporte de un incidente de seguridad | `[COMPLETAR: seguridad@restoba.com.ar]` |
| Reclamo ante la autoridad de control | Agencia de Acceso a la Información Pública — Av. Pte. Julio A. Roca 710, piso 2.º, CABA — argentina.gob.ar/aaip |

---

> **Nota sobre el alcance de este documento.** Esta Política fue redactada en el marco de un
> proyecto académico, sobre el modelo de datos real de la Plataforma. No constituye asesoramiento
> legal profesional. Antes de una puesta en producción con usuarios reales debe ser revisada por un
> profesional del derecho matriculado, y debe completarse la inscripción de la base de datos ante
> la AAIP.
