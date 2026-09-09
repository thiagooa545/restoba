/** Carga los datos de ejemplo del prototipo. */
import { config } from '../config.js'
import { cerrarPool, enTransaccion } from './pool.js'
import { RESTAURANTES, TIPOS_COCINA } from './semilla-datos.js'

if (config.NODE_ENV === 'production') {
  console.error('El sembrado no corre en producción.')
  process.exit(1)
}

async function main(): Promise<void> {
  const resumen = await enTransaccion(async (cliente) => {
    await cliente.query('TRUNCATE restaurante, tipo_cocina RESTART IDENTITY CASCADE')

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

    const activos = RESTAURANTES.filter((r) => r.estado === 'activa').length
    return { cocinas: TIPOS_COCINA.length, restaurantes: RESTAURANTES.length, activos, productos, mesas }
  })

  console.log(
    `Sembrado listo: ${resumen.restaurantes} restaurantes ` +
      `(${resumen.activos} con suscripción activa), ` +
      `${resumen.cocinas} tipos de cocina, ${resumen.productos} productos y ${resumen.mesas} mesas.`,
  )
}

main()
  .catch((error: unknown) => {
    console.error('\nEl sembrado falló:\n', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => cerrarPool())
