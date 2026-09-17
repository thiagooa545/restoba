/* ════════════════════════════════════════════════════════════════════
   PARA LA EXPOSICIÓN

   El ingreso del personal del restaurante y la gestión de empleados.

   Es la puerta del panel de gestión, el lado del modelo de negocio que
   paga. Funciona igual que el ingreso del comensal —misma contraseña
   cifrada, misma sesión de quince minutos— pero devuelve además a qué
   restaurante pertenece la persona y con qué rol.

   Ese dato es el que después usa todo el panel para filtrar: el mozo de
   un local ve las mesas de SU local y de ningún otro.

   La respuesta al «¿quién carga el stock?» de la presentación está acá:
   el administrador del restaurante, que entra por esta puerta con su
   propia cuenta, distinta de la de cualquier comensal.

   Responde a: RF-01, RF-08 y RF-12.
   ════════════════════════════════════════════════════════════════════ */

import { loginStaffSchema, nuevoUsuarioSchema } from '@restoba/compartido'
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { enDesarrollo } from '../config.js'
import {
  abrirSesionStaff,
  aUsuarioPublico,
  crearEmpleado,
  desactivarEmpleado,
  listarEmpleados,
  porEmailStaff,
  porIdStaff,
  revocarSesionStaff,
  sesionStaffVigente,
} from '../db/usuarios.js'
import { requiereRol, requiereStaff } from '../middleware/staff.js'
import {
  firmarAccesoStaff,
  firmarRefreshStaff,
  hashearContrasena,
  leerRefreshStaff,
  verificarContrasena,
} from '../seguridad.js'

export const rutasStaff = Router()

const COOKIE_STAFF = 'restoba_staff'
const DIAS_30 = 30 * 24 * 60 * 60 * 1000

function ponerCookie(res: Response, token: string): void {
  res.cookie(COOKIE_STAFF, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !enDesarrollo,
    maxAge: DIAS_30,
    path: '/api/gestion',
  })
}

async function responderConSesion(req: Request, res: Response, usuarioId: number): Promise<void> {
  const fila = await porIdStaff(usuarioId)
  if (!fila) {
    res.status(500).json({ error: 'error_interno' })
    return
  }

  const sid = await abrirSesionStaff({
    usuarioId,
    expiraEn: new Date(Date.now() + DIAS_30),
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  })

  ponerCookie(res, firmarRefreshStaff({ sub: usuarioId, sid }))

  res.json({
    usuario: aUsuarioPublico(fila),
    accessToken: firmarAccesoStaff({
      sub: usuarioId,
      rol: fila.rol,
      restauranteId: fila.restaurante_id,
    }),
  })
}

// ── Ingreso ─────────────────────────────────────────────────

rutasStaff.post('/gestion/login', async (req, res) => {
  const parseo = loginStaffSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const fila = await porEmailStaff(parseo.data.email)

    // Mismo mensaje y mismo costo exista o no la cuenta, para que nadie pueda
    // averiguar quién trabaja en la plataforma probando correos.
    const hash = fila?.password_hash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin'
    const coincide = await verificarContrasena(parseo.data.password, hash)

    if (!fila || !coincide) {
      res.status(401).json({
        error: 'credenciales_invalidas',
        mensaje: 'Correo o contraseña incorrectos.',
      })
      return
    }

    await responderConSesion(req, res, fila.id)
  } catch (error) {
    console.error('Error en el ingreso del personal:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasStaff.post('/gestion/refresh', async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_STAFF]
  const datos = token ? leerRefreshStaff(token) : null

  if (!datos) {
    res.status(401).json({ error: 'sesion_expirada' })
    return
  }

  try {
    if (!(await sesionStaffVigente(datos.sid, datos.sub))) {
      res.status(401).json({ error: 'sesion_expirada' })
      return
    }

    await revocarSesionStaff(datos.sid)
    await responderConSesion(req, res, datos.sub)
  } catch (error) {
    console.error('Error renovando la sesión del personal:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasStaff.post('/gestion/logout', async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_STAFF]
  const datos = token ? leerRefreshStaff(token) : null

  if (datos) {
    try {
      await revocarSesionStaff(datos.sid)
    } catch (error) {
      console.error('Error cerrando la sesión del personal:', error)
    }
  }

  res.clearCookie(COOKIE_STAFF, { path: '/api/gestion' })
  res.json({ ok: true })
})

rutasStaff.get('/gestion/yo', requiereStaff, (req, res) => {
  res.json({ usuario: aUsuarioPublico(req.usuario!) })
})

// ── Empleados: solo el administrador ────────────────────────

rutasStaff.get('/gestion/empleados', requiereStaff, requiereRol('admin'), async (req, res) => {
  try {
    // El restaurante sale del usuario en sesión, no de la dirección.
    res.json({ empleados: await listarEmpleados(req.usuario!.restaurante_id) })
  } catch (error) {
    console.error('Error listando empleados:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasStaff.post('/gestion/empleados', requiereStaff, requiereRol('admin'), async (req, res) => {
  const parseo = nuevoUsuarioSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  try {
    if (await porEmailStaff(parseo.data.email)) {
      res.status(409).json({ error: 'email_en_uso', mensaje: 'Ya hay una cuenta con ese correo.' })
      return
    }

    const empleado = await crearEmpleado({
      restauranteId: req.usuario!.restaurante_id,
      nombre: parseo.data.nombre,
      email: parseo.data.email,
      passwordHash: await hashearContrasena(parseo.data.password),
      rol: parseo.data.rol,
    })

    res.status(201).json({ empleado })
  } catch (error) {
    console.error('Error creando el empleado:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

const idSchema = z.coerce.number().int().positive()

rutasStaff.post(
  '/gestion/empleados/:id/baja',
  requiereStaff,
  requiereRol('admin'),
  async (req, res) => {
    const id = idSchema.safeParse(req.params.id)
    if (!id.success) {
      res.status(400).json({ error: 'id_invalido' })
      return
    }

    // Nadie se da de baja a sí mismo: el local quedaría sin administrador.
    if (id.data === req.usuario!.id) {
      res.status(409).json({
        error: 'no_podes_darte_de_baja',
        mensaje: 'No podés darte de baja a vos mismo. Pedíselo a otro administrador.',
      })
      return
    }

    try {
      const dado = await desactivarEmpleado(id.data, req.usuario!.restaurante_id)
      if (!dado) {
        res.status(404).json({ error: 'empleado_no_encontrado' })
        return
      }
      res.json({ empleados: await listarEmpleados(req.usuario!.restaurante_id) })
    } catch (error) {
      console.error('Error dando de baja al empleado:', error)
      res.status(500).json({ error: 'error_interno' })
    }
  },
)
