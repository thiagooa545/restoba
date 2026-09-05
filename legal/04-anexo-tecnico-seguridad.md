# Anexo Técnico de Seguridad y Cifrado — RestoBA

**Versión:** 1.0
**Vigencia desde:** 29 de agosto de 2026
**Última actualización:** 29 de agosto de 2026
**Documento:** `anexo-tecnico`

> Este Anexo describe, en términos concretos, **cómo protegemos técnicamente los datos** que la
> [Política de Privacidad](02-politica-de-privacidad.md) declara. Cumple con lo exigido por el
> artículo 9 de la Ley 25.326 (medidas de seguridad y confidencialidad) y documenta el
> requerimiento no funcional **RNF-03** del proyecto.
>
> Está escrito para que lo entienda tanto un usuario sin formación técnica como el equipo de
> desarrollo. Cada sección arranca con una explicación en lenguaje llano y sigue con el detalle
> técnico.

---

## 1. Arquitectura y superficie de exposición

La Plataforma se compone de tres capas, y cada una tiene su propia frontera de seguridad:

| Capa | Tecnología | Qué expone |
|---|---|---|
| **Presentación** | React (SPA) servida por el navegador del usuario | Solo la interfaz. **Nunca contiene claves, secretos ni credenciales de base de datos** |
| **Lógica** | Node.js + Express — API REST, Socket.IO | Única puerta de entrada a los datos. Valida, autentica y autoriza cada petición |
| **Datos** | PostgreSQL + PostGIS | **No accesible desde internet.** Solo acepta conexiones desde el servidor de aplicación |

**Principio de fondo:** el navegador nunca habla directamente con la base de datos. Toda consulta
pasa por la capa de lógica, que verifica quién sos y qué tenés permitido antes de tocar un solo
registro. Un usuario no puede pedirle a la base de datos algo que la API no le autorice.

---

## 2. Cifrado en tránsito — protegiendo los datos en el camino

**En simple:** todo lo que viaja entre tu navegador y nuestros servidores va dentro de un túnel
cifrado. Aunque alguien intercepte la comunicación —por ejemplo, en el Wi-Fi público de un bar—
solo vería ruido ilegible.

| Medida | Implementación |
|---|---|
| **Protocolo** | HTTPS obligatorio en todo el dominio, con TLS 1.3 (y TLS 1.2 como mínimo aceptado). Se rechazan SSL 3.0, TLS 1.0 y TLS 1.1 |
| **Certificado** | Emitido por **Let's Encrypt**, gratuito, con renovación automática cada 90 días vía `certbot` |
| **Redirección** | Todo acceso por HTTP recibe una redirección permanente (301) a HTTPS. No existe una versión no cifrada del sitio |
| **HSTS** | Encabezado `Strict-Transport-Security: max-age=31536000; includeSubDomains`, que instruye al navegador a no volver a intentar HTTP durante un año |
| **Cookies** | Marcadas `Secure` (solo viajan por HTTPS), `HttpOnly` (inaccesibles desde JavaScript, lo que neutraliza el robo de sesión por XSS) y `SameSite=Strict` (no se envían desde otros sitios, lo que mitiga CSRF) |
| **Tiempo real** | Las conexiones de Socket.IO usan **WSS** (WebSocket sobre TLS), con el mismo certificado |
| **Base de datos** | La conexión entre la aplicación y PostgreSQL exige SSL (`sslmode=require`), incluso cuando ambos están en la misma red privada |

---

## 3. Contraseñas — el punto más sensible

**En simple:** **no guardamos tu contraseña.** Ni cifrada, ni escondida, ni en ningún lado. Lo que
guardamos es una huella matemática irreversible de ella. Ni el equipo de desarrollo, ni el
administrador de la base de datos, ni alguien que robara la base entera podrían leerla.

### Cómo funciona

Cuando creás tu contraseña, se le aplica una función de hash de un solo sentido: transforma el
texto en una cadena de longitud fija, y **el proceso no se puede revertir**. Cuando iniciás sesión,
aplicamos la misma función a lo que escribiste y comparamos las dos huellas. Si coinciden, la
contraseña era correcta —sin que jamás hayamos necesitado conocerla.

| Aspecto | Implementación |
|---|---|
| **Algoritmo** | **bcrypt** con factor de costo 12 |
| **Sal (*salt*)** | Única y aleatoria por usuario, generada automáticamente por bcrypt e incorporada al hash |
| **Qué se almacena** | Solo el hash resultante, en la columna `password_hash`. **La contraseña en texto plano no se escribe jamás en disco, ni en la base, ni en los registros de error** |
| **Costo deliberado** | El factor 12 hace que calcular un hash demore unos ~250 ms. Es imperceptible al iniciar sesión, pero encarece brutalmente un ataque de fuerza bruta sobre una base robada |
| **Recuperación** | No podemos enviarte tu contraseña porque no la tenemos. El "olvidé mi contraseña" genera un enlace de un solo uso, válido por 30 minutos, que te permite establecer una nueva |

### Por qué la sal importa

Sin sal, dos usuarios con la misma contraseña tendrían el mismo hash, y un atacante podría
descifrar miles de cuentas de una sola vez con tablas precalculadas. Con una sal única por usuario,
cada hash es distinto aunque las contraseñas sean idénticas, y el atacante debe atacar cada cuenta
por separado.

### Requisitos de contraseña

Mínimo 8 caracteres, con al menos una letra y un número. Además, se rechazan las contraseñas que
figuran en listas públicas de credenciales filtradas.

---

## 4. Autenticación de sesión — JWT

**En simple:** cuando iniciás sesión, te entregamos un "pase" digital firmado. Cada vez que pedís
algo, mostrás el pase. El servidor verifica la firma y sabe que sos vos, sin volver a pedirte la
contraseña.

| Aspecto | Implementación |
|---|---|
| **Formato** | JSON Web Token (JWT) firmado con **HS256** (HMAC-SHA256) |
| **Clave de firma** | Almacenada en una variable de entorno del servidor (`.env`), **fuera del repositorio de código** y nunca versionada en Git |
| **Contenido del token** | Solo el identificador interno del usuario (`sub`), su rol y la fecha de expiración. **No contiene tu nombre, tu correo, tu teléfono ni ningún otro dato personal** |
| **Vigencia** | El token de acceso expira a los **15 minutos** |
| **Renovación** | Un *refresh token* de mayor duración, rotativo (se emite uno nuevo en cada uso e invalida el anterior), almacenado en cookie `HttpOnly` |
| **Cierre de sesión** | El *refresh token* se revoca del lado del servidor, con lo que la sesión no puede reanudarse |
| **Firma, no cifrado** | El contenido del JWT es legible; lo que garantiza la firma es que **nadie puede alterarlo** sin invalidarlo. Por eso el token no lleva datos personales |

**Por qué la expiración es corta:** si alguien te robara el token, tendría 15 minutos de ventana en
lugar de días. Es el equilibrio entre seguridad y no obligarte a iniciar sesión todo el tiempo.

---

## 5. Cifrado en reposo — protegiendo los datos guardados

**En simple:** los datos guardados en el servidor también están cifrados, para que no sirvan de
nada si alguien accediera físicamente al disco o robara una copia de respaldo.

| Capa | Medida |
|---|---|
| **Disco del servidor** | El volumen del VPS opera con cifrado a nivel de disco provisto por el proveedor de infraestructura |
| **Copias de respaldo** | Cifradas con **AES-256** antes de almacenarse. La clave de cifrado se conserva por separado de las copias |
| **Teléfono** | Cifrado a nivel de columna con **AES-256-GCM**, con la clave en variable de entorno. Se descifra únicamente cuando hay que enviar un código de verificación o comunicar un cambio de reserva |
| **Contraseñas** | No cifradas sino *hasheadas* — ver sección 3. La diferencia es esencial: el cifrado es reversible con la clave, el hash no lo es con nada |
| **Códigos de verificación** | Almacenados hasheados y con vencimiento a los 10 minutos. Se eliminan apenas se validan |

**AES-256-GCM** aporta, además de confidencialidad, autenticación del dato: si alguien modificara
el valor cifrado directamente en la base, el descifrado fallaría en lugar de devolver un dato
adulterado en silencio.

---

## 6. Control de acceso y aislamiento multiempresa

**En simple:** cada persona ve únicamente lo que le corresponde, y cada restaurante ve únicamente
sus propios datos.

### Roles del sistema

| Rol | Alcance |
|---|---|
| **Comensal** | Sus propias reservas, pedidos, reseñas y puntos. Datos públicos de los restaurantes |
| **Mozo** | Mesas y pedidos del restaurante al que pertenece |
| **Cocina** | Tablero de pedidos del restaurante al que pertenece, con permiso para cambiar su estado |
| **Administrador de restaurante** | Configuración, menú, inventario, reportes y empleados de **su** restaurante |
| **Administrador de plataforma** | Gestión del sistema. **Sin acceso a contraseñas** (son hashes) y con cada acceso a datos personales registrado en la auditoría |

### Aislamiento entre restaurantes

Todas las tablas del módulo de gestión incluyen una columna `restaurante_id`, y **toda consulta la
filtra de forma obligatoria** a partir del token del usuario autenticado, nunca a partir de un
parámetro que envíe el cliente. Un administrador del Restaurante A no puede acceder a los datos del
Restaurante B ni siquiera manipulando la petición: el identificador que determina el alcance no
viaja en la petición, se deriva de la sesión en el servidor.

### Mínimo privilegio en la base

La aplicación se conecta a PostgreSQL con un usuario que tiene solo los permisos que necesita
(`SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre las tablas de la aplicación). No es superusuario y no
puede alterar el esquema en tiempo de ejecución.

---

## 7. Protecciones a nivel de aplicación

| Amenaza | Qué es | Cómo la mitigamos |
|---|---|---|
| **Inyección SQL** | Insertar código SQL malicioso a través de un campo del formulario | **Consultas parametrizadas** en el 100 % de los accesos a la base. Los datos del usuario nunca se concatenan dentro de una sentencia SQL |
| **XSS** (*cross-site scripting*) | Inyectar JavaScript en una reseña para que se ejecute en el navegador de otros usuarios | Sanitización de entrada, escapado automático de salida en React, y `Content-Security-Policy` restrictiva |
| **CSRF** | Hacer que tu navegador ejecute una acción sin que lo sepas | Cookies `SameSite=Strict` y token anti-CSRF en las operaciones que modifican datos |
| **Fuerza bruta** | Probar miles de contraseñas hasta acertar | *Rate limiting*: máximo 5 intentos de inicio de sesión por cuenta cada 15 minutos, más límite por IP. El costo de bcrypt encarece cada intento |
| **Spam de reseñas** | Inundar un restaurante de reseñas falsas | Límite de una reseña por usuario y por visita registrada, más *rate limiting* sobre la publicación |
| **Enumeración de usuarios** | Descubrir qué correos están registrados | Los mensajes de error de inicio de sesión y de recuperación son idénticos exista o no la cuenta |
| **Peticiones desde otros orígenes** | Que un sitio externo consuma nuestra API | **CORS** restringido al dominio oficial de la Plataforma |
| **Cabeceras inseguras** | Configuración por defecto que filtra información | Middleware `helmet` en Express: `X-Frame-Options`, `X-Content-Type-Options`, ocultamiento de `X-Powered-By`, entre otras |
| **Carga de archivos maliciosos** | Subir un ejecutable disfrazado de foto de perfil | Validación de tipo MIME real, límite de tamaño, reprocesamiento de la imagen y almacenamiento fuera del directorio ejecutable |

Toda entrada del usuario se **valida en el servidor**, con independencia de las validaciones del
formulario en el navegador. La validación del lado del cliente mejora la experiencia; la del
servidor es la que protege.

---

## 8. Geolocalización

- El permiso lo otorga el usuario en su navegador, de forma **explícita y revocable**.
- La coordenada se usa **en memoria**, dentro de la consulta PostGIS que busca restaurantes
  cercanos, y se descarta al terminar la petición.
- **No se persiste en la base de datos** ni se asocia al perfil del usuario. No existe un historial
  de ubicaciones porque no se construye.
- La precisión se reduce deliberadamente a nivel de manzana: alcanza para ordenar restaurantes por
  cercanía y evita identificar un domicilio.
- Si el permiso se deniega, la búsqueda funciona igual por barrio o dirección ingresada a mano.

---

## 9. Registro de auditoría

Se registran, con fecha, hora y actor:

- inicios de sesión, exitosos y fallidos;
- accesos administrativos a datos personales de usuarios;
- modificaciones y bajas de reseñas;
- ajustes manuales de saldos de puntos;
- cambios de rol y de permisos;
- aceptaciones y revocaciones del marco legal.

**Los registros nunca contienen contraseñas, tokens de sesión, códigos de verificación ni el
contenido cifrado de campos sensibles.** Se conservan 12 meses y luego se eliminan.

---

## 10. Copias de respaldo y continuidad

| Aspecto | Definición |
|---|---|
| **Frecuencia** | Respaldo completo diario, automatizado |
| **Cifrado** | AES-256 antes del almacenamiento |
| **Ubicación** | Separada del servidor de producción |
| **Retención** | 30 días de rotación |
| **Prueba de restauración** | Verificación periódica de que una copia efectivamente se puede restaurar. Un respaldo que nunca se probó no es un respaldo |
| **Objetivo de recuperación** | `[COMPLETAR: por ejemplo, RTO 4 horas / RPO 24 horas]` |

---

## 11. Gestión de incidentes de seguridad

Ante un incidente que comprometa datos personales, el procedimiento es:

1. **Detección y contención** — aislar el vector, revocar credenciales y sesiones comprometidas.
2. **Evaluación** — determinar qué datos, de qué usuarios y en qué volumen se vieron afectados.
3. **Notificación a los usuarios afectados** — por correo electrónico, dentro de las **72 horas** de
   confirmado el incidente, indicando qué datos se comprometieron, qué estamos haciendo y qué
   medidas conviene que tomen (típicamente, cambiar la contraseña).
4. **Aviso a la AAIP** como autoridad de control.
5. **Registro y análisis posterior** — documentar causa raíz y medidas correctivas adoptadas.

**Canal para reportar una vulnerabilidad:** `[COMPLETAR: seguridad@restoba.com.ar]`. Agradecemos el
reporte responsable y nos comprometemos a no iniciar acciones contra quien investigue de buena fe,
sin acceder a datos de terceros ni degradar el servicio.

---

## 12. Lo que explícitamente NO hacemos

| No hacemos | Por qué importa |
|---|---|
| **No almacenamos datos de tarjetas, CBU, CVU ni credenciales bancarias** | La Plataforma no procesa pagos. El comensal no paga; la suscripción de los restaurantes se cobra por transferencia bancaria directa, fuera del sistema. No hay datos de pago que robar porque no existen en la base |
| **No vendemos ni cedemos datos personales** | No hay un modelo de negocio basado en datos: los ingresos vienen de la suscripción de los restaurantes |
| **No entrenamos modelos de IA** con datos de usuarios | Ni propios ni de terceros |
| **No tomamos decisiones automatizadas** que afecten derechos | Ninguna suspensión, baja ni pérdida de puntos se aplica sin revisión humana y sin derecho de descargo |
| **No usamos cookies publicitarias** ni de seguimiento entre sitios | No hay rastreo del usuario fuera de la Plataforma |
| **No guardamos historial de ubicaciones** | La geolocalización se usa y se descarta |
| **No enviamos contraseñas por correo** | Es técnicamente imposible: no las tenemos |

---

## 13. Limitaciones declaradas

Preferimos ser explícitos sobre los límites actuales antes que sugerir garantías que no podemos
sostener:

- **Sin auditoría de seguridad externa.** No se contrató una consultora independiente ni se realizó
  un test de intrusión profesional.
- **Sin certificaciones.** La Plataforma no cuenta con ISO 27001 ni con certificación PCI-DSS
  —esta última no aplica, dado que no se procesan pagos.
- **Sin programa formal de recompensas** por reporte de vulnerabilidades.
- **Sin cifrado de extremo a extremo** en el sentido estricto: el servidor puede leer las reseñas y
  los datos de reserva, porque necesita procesarlos para prestar el servicio. Lo que está cifrado
  es el transporte y el almacenamiento frente a terceros.
- **Dependencia de proveedores externos.** La seguridad física del centro de datos y el cifrado de
  disco dependen del proveedor de infraestructura contratado.
- **Ningún sistema es invulnerable.** Estas medidas reducen el riesgo de forma sustancial; no lo
  eliminan.

---

## 14. Tabla resumen — dato por dato

| Dato | Dónde vive | Cómo se protege | ¿Reversible? |
|---|---|---|---|
| Contraseña | `Comensal.password_hash` | Hash **bcrypt** con sal única, costo 12 | **No** — nadie puede leerla |
| Correo electrónico | `Comensal.email` | TLS en tránsito, cifrado de disco, acceso por rol | Sí |
| Teléfono | `Comensal.telefono` | **AES-256-GCM** a nivel de columna + todo lo anterior | Sí, solo con la clave |
| Fecha de nacimiento | `Comensal.fecha_nac` | TLS, cifrado de disco, acceso por rol | Sí |
| Código de verificación | Tabla temporal | Hasheado, vence a los 10 minutos, se elimina al validarse | **No** |
| Reservas y pedidos | `Reserva`, `Pedido` | TLS, cifrado de disco, aislamiento por `restaurante_id` | Sí |
| Reseñas | `Reseña` | Contenido público por diseño; se anonimiza al dar de baja la cuenta | Sí |
| Puntos y cupones | `MovimientoPuntos`, `Cupon` | TLS, cifrado de disco, auditoría de ajustes manuales | Sí |
| Geolocalización | **En ninguna parte** | No se persiste | — |
| Token de sesión | Cookie `HttpOnly` del navegador | Firmado HS256, expira en 15 minutos, sin datos personales | Legible pero inalterable |
| IP y user-agent | Registros del servidor | Acceso restringido, se eliminan a los 12 meses | Sí |
| Constancia de aceptación | `aceptacion_legal` | Hash SHA-256 del texto aceptado, inmutable | **No** — es su garantía |
| Datos de tarjeta | **No existen** | No se recolectan | — |

---

## 15. Glosario

| Término | Qué significa |
|---|---|
| **Hash** | Huella digital de un dato. Del dato se obtiene la huella, pero de la huella no se puede volver al dato |
| **Sal (*salt*)** | Valor aleatorio que se agrega antes de hashear, para que dos datos iguales produzcan huellas distintas |
| **bcrypt** | Algoritmo de hash diseñado específicamente para contraseñas, deliberadamente lento para frustrar la fuerza bruta |
| **AES-256** | Estándar de cifrado simétrico. "256" es el tamaño de la clave; es el mismo estándar que usan bancos y gobiernos |
| **TLS** | El protocolo que cifra la conexión entre tu navegador y el servidor. Es la "s" de HTTPS |
| **JWT** | Credencial digital firmada que prueba quién sos en cada petición, sin reenviar la contraseña |
| **SHA-256** | Función de hash usada para las constancias de aceptación; produce una huella de 64 caracteres |
| **PostGIS** | Extensión de PostgreSQL que permite consultas geográficas, como "restaurantes a menos de 2 km" |
| **XSS / CSRF / SQL injection** | Las tres familias de ataque más frecuentes contra aplicaciones web. Ver sección 7 |

---

> **Nota sobre el alcance de este documento.** Este Anexo fue redactado en el marco de un proyecto
> académico y describe el diseño de seguridad previsto para la Plataforma. Los parámetros aquí
> declarados deben verificarse contra la implementación efectiva antes de la puesta en producción,
> y el documento debe actualizarse cada vez que cambie la arquitectura.
