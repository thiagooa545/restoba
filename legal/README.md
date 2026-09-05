# Marco legal de RestoBA

Documentación legal de la plataforma, redactada sobre el análisis funcional y técnico real del
proyecto. Estos textos son la **fuente de verdad**: la aplicación web debe renderizarlos desde acá,
no mantener copias sueltas.

## Documentos

| # | Documento | Clave interna | Versión | Qué cubre |
|---|---|---|:---:|---|
| 01 | [Términos y Condiciones de Uso](01-terminos-y-condiciones.md) | `tyc` | 1.0 | Reglas de uso, niveles de acceso, reseñas, puntos, reservas, responsabilidad, jurisdicción |
| 02 | [Política de Privacidad](02-politica-de-privacidad.md) | `privacidad` | 1.0 | Qué datos se guardan, para qué, cuánto tiempo, con quién se comparten y derechos ARCO |
| 03 | [Acuerdo de Verificación de Usuario](03-acuerdo-de-verificacion.md) | `verificacion` | 1.0 | **El documento que habilita el estado de Usuario Verificado** |
| 04 | [Anexo Técnico de Seguridad y Cifrado](04-anexo-tecnico-seguridad.md) | `anexo-tecnico` | 1.0 | Cifrado, autenticación, protecciones y limitaciones declaradas |

El documento 04 es informativo: se referencia desde los otros tres, pero **no requiere aceptación
independiente**. Los que se aceptan son el 01, el 02 y el 03.

## Marco normativo aplicado

| Norma | Dónde impacta |
|---|---|
| **Ley 25.326** — Protección de los Datos Personales | Documento 02 completo; art. 9 en el documento 04 |
| **Decreto 1558/2001** y **Disp. AAIP 10/2008** | Leyendas obligatorias del documento 02, sección 6 |
| **Ley 24.240** — Defensa del Consumidor | Documento 01, arts. 13 y 16 |
| **Ley 25.506** — Firma Digital | Documento 03, sección 6.3 |
| **CCyC arts. 25, 286, 288, 1106** | Capacidad legal y consentimiento electrónico |
| **Ley 11.723** — Propiedad Intelectual | Documento 01, art. 12 |
| **Ley 26.388** — Delitos Informáticos | Documento 01, art. 6 |

## Cómo funciona el gate de verificación

La regla de negocio es una sola:

> Un usuario es **verificado** si y solo si tiene constancias de aceptación vigentes de los tres
> documentos (`tyc`, `privacidad`, `verificacion`) en su versión actual, además de correo y
> teléfono confirmados.

Sin esas constancias, la cuenta funciona en modo **sola lectura**: puede buscar, ver menús y leer
reseñas, pero no reservar, reseñar ni acumular puntos.

### Tabla de constancias

```sql
CREATE TABLE aceptacion_legal (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER      NOT NULL REFERENCES comensal(id) ON DELETE CASCADE,
  documento    VARCHAR(32)  NOT NULL,  -- 'tyc' | 'privacidad' | 'verificacion'
  version      VARCHAR(16)  NOT NULL,  -- '1.0'
  hash_texto   CHAR(64)     NOT NULL,  -- SHA-256 del texto exhibido
  aceptado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revocado_en  TIMESTAMPTZ,            -- NULL mientras esté vigente
  ip           INET,
  user_agent   TEXT,
  CONSTRAINT documento_valido
    CHECK (documento IN ('tyc', 'privacidad', 'verificacion')),
  CONSTRAINT una_aceptacion_por_version
    UNIQUE (usuario_id, documento, version)
);

CREATE INDEX idx_aceptacion_usuario ON aceptacion_legal (usuario_id, documento);
```

La constancia **no se borra nunca**: al revocar se completa `revocado_en`. El registro se conserva
5 años desde la baja de la cuenta, como prueba del consentimiento prestado (documento 02,
sección 3).

### Consulta que resuelve el estado

```sql
SELECT COUNT(DISTINCT documento) = 3 AS verificado
FROM   aceptacion_legal
WHERE  usuario_id  = $1
  AND  revocado_en IS NULL
  AND (documento, version) IN
       (('tyc','1.0'), ('privacidad','1.0'), ('verificacion','1.0'));
```

### Requisitos de la pantalla de aceptación

Derivados del documento 03, sección 6.1 — son obligatorios, no cosméticos:

1. Exhibir el **texto completo** de cada documento, no un resumen.
2. Una casilla **independiente por documento**, **ninguna pre-marcada**.
3. Botón de confirmación **deshabilitado** hasta que las tres estén marcadas.
4. Registrar la constancia con el **hash SHA-256 del texto exhibido**, calculado sobre el mismo
   archivo que se renderizó.
5. Ofrecer una salida clara: se puede cerrar sin aceptar y seguir usando la Plataforma.

### Versionado

Se usa versionado semántico, y el número **decide si hay que reaceptar**:

| Cambio | Ejemplo | ¿Requiere reaceptación? |
|---|---|:---:|
| **Mayor** — modifica derechos u obligaciones | 1.0 → 2.0 | **Sí** |
| **Menor** — aclaraciones, redacción, correcciones | 1.0 → 1.1 | No |

Al publicar una versión mayor: archivar la anterior en `legal/historico/`, actualizar la tabla de
este README, notificar por correo con 10 días de anticipación y degradar a los usuarios que no
reacepten al nivel de Usuario Registrado, **sin borrar sus datos** (documento 03, sección 8).

## Pendientes antes de producción

- [ ] Completar los marcadores `[COMPLETAR]` — razón social, CUIT, domicilio, casillas de correo,
      proveedores contratados y plazos de vigencia de puntos y cancelación.
- [ ] Inscribir la base de datos ante la **AAIP** (art. 21 Ley 25.326).
- [ ] Revisión por un profesional del derecho matriculado.
- [ ] Verificar que la implementación coincida con lo declarado en el Anexo Técnico —bcrypt costo
      12, TLS 1.3, JWT de 15 minutos, AES-256-GCM sobre el teléfono— y corregir el documento si
      alguna decisión cambia.
- [ ] Redactar el **contrato de suscripción B2B** para Restaurantes Adheridos, que no forma parte de
      este marco.

## Alcance

Estos documentos cubren la relación con el **comensal**. La relación con los Restaurantes Adheridos
—suscripción, obligaciones, nivel de servicio, baja— requiere un contrato comercial separado.

Fueron redactados en el marco de un proyecto académico. No constituyen asesoramiento legal
profesional.
