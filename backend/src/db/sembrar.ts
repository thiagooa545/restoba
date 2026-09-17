/** Carga los datos de ejemplo del prototipo. */
import { DOCUMENTOS_LEGALES, VERSION_LEGAL_VIGENTE, ARCHIVO_LEGAL } from '@restoba/compartido'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { config, DIR_LEGAL } from '../config.js'
import { hashearContrasena, sha256 } from '../seguridad.js'
import { cerrarPool, enTransaccion } from './pool.js'
import { RESTAURANTES, TIPOS_COCINA } from './semilla-datos.js'
import { COMENSALES, PASSWORD_DEMO, RESENAS } from './semilla-resenas.js'

/** Contraseña de las cuentas de personal sembradas. Solo para desarrollo. */
const PASSWORD_STAFF = 'gestion2026'

/** Palabras que no sirven para identificar un local en su dirección de correo. */
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'il', 'lo', 'un', 'una', 'de', 'del', 'dona', 'don'])

if (config.NODE_ENV === 'production') {
  console.error('El sembrado no corre en producción.')
  process.exit(1)
}

async function main(): Promise<void> {
  const resumen = await enTransaccion(async (cliente) => {
    await cliente.query('TRUNCATE restaurante, tipo_cocina, comensal RESTART IDENTITY CASCADE')
    // CASCADE arrastra usuario, sesion_staff y suscripcion, que cuelgan de restaurante.

    const idCocina = new Map<string, number>()
    for (const tipo of TIPOS_COCINA) {
      const { rows } = await cliente.query<{ id: number }>(
        'INSERT INTO tipo_cocina (nombre, slug) VALUES ($1, $2) RETURNING id',
        [tipo.nombre, tipo.slug],
      )
      idCocina.set(tipo.slug, rows[0]!.id)
    }

    let productos = 0
    let mesas = 0
    let empleados = 0

    // Una sola vez: bcrypt es lento a propósito, y son 33 cuentas.
    const hashStaff = await hashearContrasena(PASSWORD_STAFF)
    const idRestaurante = new Map<string, number>()

    for (const r of RESTAURANTES) {
      const { rows } = await cliente.query<{ id: number }>(
        `INSERT INTO restaurante
           (nombre, descripcion, plan, estado, direccion, barrio, ubicacion,
            rango_precio, telefono, calificacion_prom, cantidad_resenas)
         VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography,
                 $9, $10, $11, $12)
         RETURNING id`,
        [
          r.nombre, r.descripcion, r.plan, r.estado, r.direccion, r.barrio,
          r.lng, r.lat, r.rangoPrecio, r.telefono, r.calificacion, r.resenas,
        ],
      )
      const restauranteId = rows[0]!.id
      idRestaurante.set(r.nombre, restauranteId)

      for (const slug of r.cocinas) {
        const cocinaId = idCocina.get(slug)
        if (!cocinaId) throw new Error(`El tipo de cocina "${slug}" no existe (restaurante ${r.nombre}).`)
        await cliente.query(
          'INSERT INTO restaurante_tipo_cocina (restaurante_id, tipo_cocina_id) VALUES ($1, $2)',
          [restauranteId, cocinaId],
        )
      }

      // Salón: más mesas chicas que grandes, que es como son los salones.
      const plantilla: [number, number][] = r.rangoPrecio === 3
        ? [[2, 6], [4, 4], [6, 2]]
        : [[2, 5], [4, 6], [6, 3], [8, 1]]
      let numero = 1
      for (const [capacidad, cuantas] of plantilla) {
        for (let k = 0; k < cuantas; k += 1) {
          await cliente.query(
            'INSERT INTO mesa (restaurante_id, numero, capacidad) VALUES ($1, $2, $3)',
            [restauranteId, String(numero), capacidad],
          )
          numero += 1
          mesas += 1
        }
      }

      // ── Personal del local y suscripción ──────────────────
      // Tres cuentas por restaurante, una por rol. El correo se arma con la
      // primera palabra del nombre para que sea fácil de recordar en la demo.
      const palabras = r.nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/\s+/)
        .map((palabra) => palabra.replace(/[^a-z]/g, ''))
        .filter((palabra) => palabra.length > 0)

      // Se saltean los artículos, así «La Rambla de Chacarita» da rambla y no la.
      const slug = palabras.find((palabra) => !ARTICULOS.has(palabra)) ?? palabras[0]!

      for (const rol of ['admin', 'mozo', 'cocina'] as const) {
        await cliente.query(
          `INSERT INTO usuario (restaurante_id, nombre, email, password_hash, rol)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            restauranteId,
            `${rol === 'admin' ? 'Administración' : rol === 'mozo' ? 'Salón' : 'Cocina'} · ${r.nombre}`,
            `${rol}@${slug}.ar`,
            hashStaff,
            rol,
          ],
        )
        empleados += 1
      }

      // El período corriente. Si el local figura activo, la transferencia ya se
      // acreditó; si no, queda pendiente, que es exactamente lo que le pasa a
      // «Trattoria Fantasma» y por eso no aparece en el buscador.
      const acreditada = r.estado === 'activa'
      await cliente.query(
        `INSERT INTO suscripcion
           (restaurante_id, plan, periodo_desde, periodo_hasta, monto, estado,
            comprobante, acreditada_en)
         VALUES ($1, $2, date_trunc('month', current_date),
                 date_trunc('month', current_date) + interval '1 month' - interval '1 day',
                 $3, $4, $5, $6)`,
        [
          restauranteId,
          r.plan,
          r.plan === 'completo' ? 45000 : 28000,
          acreditada ? 'activa' : 'pendiente_acreditacion',
          acreditada ? `TRF-${String(restauranteId).padStart(6, '0')}` : null,
          acreditada ? new Date() : null,
        ],
      )

      for (const [dia, abre, cierra] of r.horarios) {
        await cliente.query(
          'INSERT INTO horario (restaurante_id, dia_semana, abre, cierra) VALUES ($1, $2, $3, $4)',
          [restauranteId, dia, abre, cierra],
        )
      }

      const idCategoria = new Map<string, number>()
      for (const p of r.carta) {
        let categoriaId = idCategoria.get(p.categoria)
        if (!categoriaId) {
          const { rows: cat } = await cliente.query<{ id: number }>(
            'INSERT INTO categoria (restaurante_id, nombre, orden) VALUES ($1, $2, $3) RETURNING id',
            [restauranteId, p.categoria, idCategoria.size],
          )
          categoriaId = cat[0]!.id
          idCategoria.set(p.categoria, categoriaId)
        }

        await cliente.query(
          `INSERT INTO producto
             (restaurante_id, categoria_id, nombre, descripcion, precio,
              activo, vegetariano, sin_tacc, destacado, orden)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            restauranteId, categoriaId, p.nombre, p.descripcion, p.precio,
            p.activo ?? true, p.vegetariano ?? false, p.sinTacc ?? false,
            p.destacado ?? false, productos,
          ],
        )
        productos += 1
      }
    }

    // ── Comensales de ejemplo, verificados ──────────────────
    // Se les registra la aceptación de los tres documentos con el hash real
    // de cada archivo: si no, serían usuarios verificados sin constancia, que
    // es justamente lo que el gate no permite.
    const hashLegal = new Map<string, string>()
    for (const doc of DOCUMENTOS_LEGALES) {
      const texto = await readFile(resolve(DIR_LEGAL, ARCHIVO_LEGAL[doc]), 'utf8')
      hashLegal.set(doc, sha256(texto))
    }

    const passwordHash = await hashearContrasena(PASSWORD_DEMO)
    const idComensal: number[] = []

    for (const c of COMENSALES) {
      const { rows: filas } = await cliente.query<{ id: number }>(
        `INSERT INTO comensal (nombre, email, password_hash, email_verificado, telefono_verificado)
         VALUES ($1, $2, $3, true, true) RETURNING id`,
        [c.nombre, c.email, passwordHash],
      )
      const id = filas[0]!.id
      idComensal.push(id)

      for (const doc of DOCUMENTOS_LEGALES) {
        await cliente.query(
          `INSERT INTO aceptacion_legal (usuario_id, documento, version, hash_texto)
           VALUES ($1, $2, $3, $4)`,
          [id, doc, VERSION_LEGAL_VIGENTE, hashLegal.get(doc)],
        )
      }
    }

    // ── Reseñas, cada una con su visita previa ──────────────
    let resenas = 0
    let turno = 0

    for (const [nombreResto, comentarios] of Object.entries(RESENAS)) {
      const restauranteId = idRestaurante.get(nombreResto)
      if (!restauranteId) continue

      const { rows: mesasDelLocal } = await cliente.query<{ id: number }>(
        'SELECT id FROM mesa WHERE restaurante_id = $1 ORDER BY id LIMIT 1',
        [restauranteId],
      )
      const mesaId = mesasDelLocal[0]?.id ?? null

      for (const [i, c] of comentarios.entries()) {
        const comensalId = idComensal[(turno + i) % idComensal.length]!
        // Visitas repartidas entre hace una semana y hace cuatro meses.
        const diasAtras = 7 + ((i * 17 + turno * 11) % 110)

        const { rows: reservaFilas } = await cliente.query<{ id: number }>(
          `INSERT INTO reserva
             (restaurante_id, comensal_id, mesa_id, fecha, hora, cantidad_personas, estado)
           VALUES ($1, $2, $3,
                   ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - $4::int),
                   '21:00', $5, 'cumplida')
           RETURNING id`,
          [restauranteId, comensalId, mesaId, diasAtras, 2 + (i % 3)],
        )
        const reservaId = reservaFilas[0]!.id

        const { rows: resenaFilas } = await cliente.query<{ id: number }>(
          `INSERT INTO resena
             (restaurante_id, comensal_id, autor, reserva_id, puntuacion, comentario,
              respuesta, respuesta_en, creada_en)
           VALUES ($1, $2, $3, $4, $5, $6, $7,
                   CASE WHEN $7::text IS NULL THEN NULL
                        ELSE now() - make_interval(days => $8::int - 1) END,
                   now() - make_interval(days => $8::int))
           RETURNING id`,
          [
            restauranteId, comensalId, COMENSALES[(turno + i) % COMENSALES.length]!.nombre,
            reservaId, c.puntuacion, c.texto, c.respuesta ?? null, diasAtras,
          ],
        )

        // Los puntos de la visita y de la reseña, como si los hubiera ganado.
        await cliente.query(
          `INSERT INTO movimiento_puntos (comensal_id, puntos, motivo, restaurante_id, reserva_id, detalle)
           VALUES ($1, 50, 'visita', $2, $3, 'Por completar una visita')`,
          [comensalId, restauranteId, reservaId],
        )
        await cliente.query(
          `INSERT INTO movimiento_puntos (comensal_id, puntos, motivo, restaurante_id, resena_id, detalle)
           VALUES ($1, 120, 'resena', $2, $3, 'Por publicar una reseña')`,
          [comensalId, restauranteId, resenaFilas[0]!.id],
        )

        resenas += 1
      }
      turno += comentarios.length
    }

    // El promedio y el total salen de las reseñas reales, no de un número fijo.
    await cliente.query(
      `UPDATE restaurante r
       SET    calificacion_prom = sub.prom, cantidad_resenas = sub.n
       FROM (
         SELECT restaurante_id, round(avg(puntuacion)::numeric, 1) AS prom, count(*)::int AS n
         FROM   resena WHERE oculta_en IS NULL GROUP BY restaurante_id
       ) sub
       WHERE r.id = sub.restaurante_id`,
    )
    // Los que no tienen ninguna reseña quedan en NULL, no en cero.
    await cliente.query(
      `UPDATE restaurante SET calificacion_prom = NULL, cantidad_resenas = 0
       WHERE id NOT IN (SELECT DISTINCT restaurante_id FROM resena)`,
    )

    const activos = RESTAURANTES.filter((r) => r.estado === 'activa').length
    return {
      cocinas: TIPOS_COCINA.length, restaurantes: RESTAURANTES.length, activos,
      productos, mesas, empleados, comensales: COMENSALES.length, resenas,
    }
  })

  console.log(
    `Sembrado listo: ${resumen.restaurantes} restaurantes ` +
      `(${resumen.activos} con suscripción activa), ` +
      `${resumen.cocinas} tipos de cocina, ${resumen.productos} productos, ${resumen.mesas} mesas, ` +
      `${resumen.comensales} comensales, ${resumen.resenas} reseñas con su visita previa ` +
      `y ${resumen.empleados} cuentas de personal.`,
  )

  console.log(
    `\nPara entrar al panel de gestión: admin@cantina.ar / ${PASSWORD_STAFF}\n` +
      `También hay mozo@cantina.ar y cocina@cantina.ar, y las mismas tres cuentas ` +
      `para cada local (mozo@rambla.ar, admin@verde.ar, etcétera).`,
  )
}

main()
  .catch((error: unknown) => {
    console.error('\nEl sembrado falló:\n', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => cerrarPool())
