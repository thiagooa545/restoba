/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   La lógica de las reservas: qué turnos hay libres y cómo se asigna la mesa.

   Los turnos no están escritos a mano: salen de la tabla de horarios de cada
   local, cada media hora, y el último se ofrece una hora antes del cierre. No
   tiene sentido sentar gente cuando el local está por cerrar.

   Cada reserva ocupa la mesa dos horas, y se asigna la mesa más chica donde entre
   el grupo, para no gastar una de ocho en una pareja.

   El detalle que vale contar: la asignación corre dentro de una transacción y
   bloquea las mesas mientras decide. Si dos personas confirman el mismo horario
   al mismo tiempo, no pueden quedarse las dos con la misma mesa; la segunda
   recibe el aviso de que se ocupó.

   Responde a: RF-07.
   ════════════════════════════════════════════════════════════════════ */

import {
  DURACION_RESERVA_MIN,
  HORAS_PARA_CANCELAR,
  PASO_TURNO_MIN,
  type Disponibilidad,
  type EstadoReserva,
  type Reserva,
  type Turno,
} from '@restoba/compartido'
import { consultar, consultarUna, enTransaccion } from './pool.js'

const TZ = 'America/Argentina/Buenos_Aires'

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const aHora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60) % 24).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/**
 * Turnos que ofrece el local ese día, derivados de su tabla de horarios.
 *
 * Un turno que cruza la medianoche (20:00–01:30) se representa con minutos por
 * encima de 1440, así se ordena y se compara sin casos especiales. El último
 * turno ofrecido termina una hora antes del cierre: no tiene sentido sentar
 * gente cuando están por cerrar.
 */
async function turnosDelDia(restauranteId: number, fecha: string): Promise<number[]> {
  const filas = await consultar<{ abre: string; cierra: string }>(
    `SELECT h.abre::text AS abre, h.cierra::text AS cierra
     FROM   horario h
     WHERE  h.restaurante_id = $1
       AND  h.dia_semana = EXTRACT(DOW FROM $2::date)::int
     ORDER BY h.abre`,
    [restauranteId, fecha],
  )

  const turnos: number[] = []

  for (const { abre, cierra } of filas) {
    const desde = aMinutos(abre)
    let hasta = aMinutos(cierra)
    if (hasta <= desde) hasta += 24 * 60

    for (let t = desde; t <= hasta - 60; t += PASO_TURNO_MIN) turnos.push(t)
  }

  return [...new Set(turnos)].sort((a, b) => a - b)
}

export async function disponibilidad(
  restauranteId: number,
  fecha: string,
  personas: number,
): Promise<Disponibilidad> {
  const mesas = await consultar<{ id: number; capacidad: number }>(
    `SELECT id, capacidad FROM mesa WHERE restaurante_id = $1 ORDER BY capacidad, numero`,
    [restauranteId],
  )

  const capacidadMaxima = mesas.reduce((max, m) => Math.max(max, m.capacidad), 0)
  const aptas = mesas.filter((m) => m.capacidad >= personas)
  const turnosBase = await turnosDelDia(restauranteId, fecha)

  if (turnosBase.length === 0) {
    return { fecha, personas, abierto: false, turnos: [], capacidadMaxima }
  }

  const ocupadas = await consultar<{ mesa_id: number; hora: string }>(
    `SELECT mesa_id, hora::text AS hora
     FROM   reserva
     WHERE  restaurante_id = $1 AND fecha = $2
       AND  estado = 'confirmada' AND mesa_id IS NOT NULL`,
    [restauranteId, fecha],
  )

  // Cada reserva bloquea su mesa durante todo el bloque de dos horas.
  const bloqueos = ocupadas.map((o) => ({ mesa: o.mesa_id, desde: aMinutos(o.hora) }))

  const ahora = await consultarUna<{ hoy: string; minutos: number }>(
    `SELECT to_char((now() AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS hoy,
            (EXTRACT(HOUR FROM (now() AT TIME ZONE '${TZ}')) * 60
             + EXTRACT(MINUTE FROM (now() AT TIME ZONE '${TZ}')))::int AS minutos`,
  )
  const esHoy = ahora?.hoy === fecha
  const minutosAhora = ahora?.minutos ?? 0

  const turnos: Turno[] = turnosBase.map((t) => {
    const libres = aptas.filter((m) =>
      bloqueos.every(
        (b) => b.mesa !== m.id || Math.abs(b.desde - t) >= DURACION_RESERVA_MIN,
      ),
    ).length

    // Un turno de hoy que ya pasó no se ofrece.
    const yaPaso = esHoy && t <= minutosAhora
    return { hora: aHora(t), libre: libres > 0 && !yaPaso, mesasLibres: libres }
  })

  return { fecha, personas, abierto: true, turnos, capacidadMaxima }
}

type ResultadoReserva =
  | { ok: true; id: number }
  | { ok: false; motivo: 'cerrado' | 'turno_no_disponible' | 'sin_mesa' | 'grupo_muy_grande' | 'duplicada' }

/**
 * Crea la reserva asignando la mesa más chica que alcance, para no gastar una
 * mesa de ocho en una pareja. Corre en transacción y vuelve a chequear la
 * disponibilidad adentro: entre que el usuario vio los turnos y confirmó,
 * alguien más pudo tomar la última mesa.
 */
export async function crearReserva(datos: {
  restauranteId: number
  comensalId: number
  fecha: string
  hora: string
  personas: number
  notas?: string
}): Promise<ResultadoReserva> {
  const turnos = await turnosDelDia(datos.restauranteId, datos.fecha)
  const minutos = aMinutos(datos.hora)

  if (turnos.length === 0) return { ok: false, motivo: 'cerrado' }
  if (!turnos.includes(minutos)) return { ok: false, motivo: 'turno_no_disponible' }

  return enTransaccion(async (cliente) => {
    const yaTiene = await cliente.query(
      `SELECT 1 FROM reserva
       WHERE comensal_id = $1 AND restaurante_id = $2 AND fecha = $3
         AND estado = 'confirmada'`,
      [datos.comensalId, datos.restauranteId, datos.fecha],
    )
    if (yaTiene.rowCount) return { ok: false, motivo: 'duplicada' as const }

    // FOR UPDATE bloquea las filas hasta el commit: dos personas que confirman
    // el mismo turno al mismo tiempo no pueden llevarse la misma mesa.
    const { rows: mesas } = await cliente.query<{ id: number; capacidad: number }>(
      `SELECT id, capacidad FROM mesa
       WHERE restaurante_id = $1 AND capacidad >= $2
       ORDER BY capacidad, numero
       FOR UPDATE`,
      [datos.restauranteId, datos.personas],
    )

    if (mesas.length === 0) return { ok: false, motivo: 'grupo_muy_grande' as const }

    const { rows: ocupadas } = await cliente.query<{ mesa_id: number; hora: string }>(
      `SELECT mesa_id, hora::text AS hora
       FROM   reserva
       WHERE  restaurante_id = $1 AND fecha = $2
         AND  estado = 'confirmada' AND mesa_id IS NOT NULL`,
      [datos.restauranteId, datos.fecha],
    )

    const elegida = mesas.find((m) =>
      ocupadas.every(
        (o) => o.mesa_id !== m.id || Math.abs(aMinutos(o.hora) - minutos) >= DURACION_RESERVA_MIN,
      ),
    )

    if (!elegida) return { ok: false, motivo: 'sin_mesa' as const }

    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO reserva
         (restaurante_id, comensal_id, mesa_id, fecha, hora, cantidad_personas, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        datos.restauranteId,
        datos.comensalId,
        elegida.id,
        datos.fecha,
        datos.hora,
        datos.personas,
        datos.notas ?? null,
      ],
    )

    return { ok: true as const, id: rows[0]!.id }
  })
}

type FilaReserva = {
  id: number
  restaurante_id: number
  restaurante: string
  direccion: string
  fecha: string
  hora: string
  cantidad_personas: number
  estado: EstadoReserva
  notas: string | null
  mesa: string | null
  minutos_faltantes: string | null
}

function aReserva(f: FilaReserva): Reserva {
  const faltan = f.minutos_faltantes === null ? 0 : Number(f.minutos_faltantes)
  return {
    id: f.id,
    restauranteId: f.restaurante_id,
    restaurante: f.restaurante,
    direccion: f.direccion,
    fecha: f.fecha,
    hora: f.hora.slice(0, 5),
    personas: f.cantidad_personas,
    estado: f.estado,
    notas: f.notas,
    mesa: f.mesa,
    cancelable: f.estado === 'confirmada' && faltan > HORAS_PARA_CANCELAR * 60,
    cumplida: f.estado === 'confirmada' && faltan <= 0,
  }
}

const SELECT_RESERVA = `
  SELECT rv.id, rv.restaurante_id, r.nombre AS restaurante, r.direccion,
         to_char(rv.fecha, 'YYYY-MM-DD') AS fecha,
         rv.hora::text AS hora,
         rv.cantidad_personas, rv.estado, rv.notas,
         m.numero AS mesa,
         EXTRACT(EPOCH FROM ((rv.fecha + rv.hora) - (now() AT TIME ZONE '${TZ}'))) / 60 AS minutos_faltantes
  FROM   reserva rv
  JOIN   restaurante r ON r.id = rv.restaurante_id
  LEFT JOIN mesa m ON m.id = rv.mesa_id
`

export async function reservasDe(comensalId: number): Promise<Reserva[]> {
  const filas = await consultar<FilaReserva>(
    `${SELECT_RESERVA} WHERE rv.comensal_id = $1 ORDER BY rv.fecha DESC, rv.hora DESC`,
    [comensalId],
  )
  return filas.map(aReserva)
}

export async function reservaDe(id: number, comensalId: number): Promise<Reserva | null> {
  const fila = await consultarUna<FilaReserva>(
    `${SELECT_RESERVA} WHERE rv.id = $1 AND rv.comensal_id = $2`,
    [id, comensalId],
  )
  return fila ? aReserva(fila) : null
}

export async function cancelarReserva(id: number, comensalId: number): Promise<boolean> {
  const filas = await consultar<{ id: number }>(
    `UPDATE reserva
     SET    estado = 'cancelada', cancelada_en = now()
     WHERE  id = $1 AND comensal_id = $2 AND estado = 'confirmada'
     RETURNING id`,
    [id, comensalId],
  )
  return filas.length > 0
}

/**
 * ¿Este comensal visitó ya este local? Es la condición del T&C art. 7.5 para
 * poder reseñar: tiene que existir una reserva o un pedido previo.
 */
export async function tuvoVisita(comensalId: number, restauranteId: number): Promise<boolean> {
  const fila = await consultarUna<{ existe: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM reserva
       WHERE  comensal_id = $1 AND restaurante_id = $2
         AND  estado IN ('confirmada', 'cumplida')
         AND  (fecha + hora) <= (now() AT TIME ZONE '${TZ}')
     ) AS existe`,
    [comensalId, restauranteId],
  )
  return fila?.existe ?? false
}
