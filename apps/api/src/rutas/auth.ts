import {
  codigoSchema,
  loginSchema,
  registroSchema,
  telefonoSchema,
  type RespuestaSesion,
} from '@restoba/shared'
import { Router, type Request, type Response } from 'express'
import { enDesarrollo } from '../config.js'
import {
  abrirSesion,
  aPublico,
  crearComensal,
  guardarCodigoEmail,
  guardarTelefono,
  marcarEmailVerificado,
  marcarTelefonoVerificado,
  porEmail,
  porId,
  revocarSesion,
  sesionVigente,
} from '../db/comensales.js'
import { requiereSesion } from '../middleware/auth.js'
import {
  cifrarTelefono,
  codigoCoincide,
  firmarAcceso,
  firmarRefresh,
  generarCodigo,
  hashearCodigo,
  hashearContrasena,
  leerRefresh,
  verificarContrasena,
} from '../seguridad.js'

export const rutasAuth = Router()

const COOKIE_REFRESH = 'restoba_refresh'
const DIAS_30 = 30 * 24 * 60 * 60 * 1000
const MINUTOS_15 = 15 * 60 * 1000

function datosPedido(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  }
}

function ponerCookie(res: Response, token: string): void {
  res.cookie(COOKIE_REFRESH, token, {
    httpOnly: true, // fuera del alcance de cualquier script de la página
    sameSite: 'lax',
    secure: !enDesarrollo, // en producción viaja solo por HTTPS
    maxAge: DIAS_30,
    path: '/api/auth',
  })
}

async function responderConSesion(
  req: Request,
  res: Response,
  comensalId: number,
  codigoDemo?: string,
): Promise<void> {
  const fila = await porId(comensalId)
  if (!fila) {
    res.status(500).json({ error: 'error_interno' })
    return
  }

  const { ip, userAgent } = datosPedido(req)
  const sid = await abrirSesion({
    comensalId,
    expiraEn: new Date(Date.now() + DIAS_30),
    ip,
    userAgent,
  })

  ponerCookie(res, firmarRefresh({ sub: comensalId, sid }))

  const cuerpo: RespuestaSesion = {
    comensal: await aPublico(fila),
    accessToken: firmarAcceso({ sub: comensalId, email: fila.email }),
  }
  // El código solo se devuelve en desarrollo. En producción sale por correo o SMS.
  if (enDesarrollo && codigoDemo) cuerpo.codigoDemo = codigoDemo

  res.json(cuerpo)
}

// ── Registro ────────────────────────────────────────────────

rutasAuth.post('/auth/registro', async (req, res) => {
  const parseo = registroSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  const { nombre, email, password } = parseo.data

  try {
    if (await porEmail(email)) {
      res.status(409).json({ error: 'email_en_uso', mensaje: 'Ya hay una cuenta con ese correo.' })
      return
    }

    const codigo = generarCodigo()
    const fila = await crearComensal({
      nombre,
      email,
      passwordHash: await hashearContrasena(password),
      codigoEmail: hashearCodigo(codigo),
      venceEn: new Date(Date.now() + MINUTOS_15),
    })

    if (enDesarrollo) {
      console.log(`[desarrollo] Código de confirmación de ${email}: ${codigo}`)
    }

    await responderConSesion(req, res, fila.id, codigo)
  } catch (error) {
    console.error('Error en el registro:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Inicio de sesión ────────────────────────────────────────

rutasAuth.post('/auth/login', async (req, res) => {
  const parseo = loginSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'datos_invalidos' })
    return
  }

  try {
    const fila = await porEmail(parseo.data.email)

    // Mismo mensaje y mismo costo tanto si el correo no existe como si la
    // contraseña es incorrecta: si no, se podría averiguar quién tiene cuenta.
    const hash = fila?.password_hash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin'
    const coincide = await verificarContrasena(parseo.data.password, hash)

    if (!fila || !coincide) {
      res.status(401).json({ error: 'credenciales_invalidas', mensaje: 'Correo o contraseña incorrectos.' })
      return
    }

    await responderConSesion(req, res, fila.id)
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

// ── Renovación y cierre ─────────────────────────────────────

rutasAuth.post('/auth/refresh', async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_REFRESH]
  const datos = token ? leerRefresh(token) : null

  if (!datos) {
    res.status(401).json({ error: 'sesion_expirada' })
    return
  }

  try {
    if (!(await sesionVigente(datos.sid, datos.sub))) {
      res.status(401).json({ error: 'sesion_expirada' })
      return
    }

    const fila = await porId(datos.sub)
    if (!fila) {
      res.status(401).json({ error: 'sesion_expirada' })
      return
    }

    // Rotación: la sesión anterior se revoca y se abre una nueva.
    await revocarSesion(datos.sid)
    await responderConSesion(req, res, fila.id)
  } catch (error) {
    console.error('Error renovando la sesión:', error)
    res.status(500).json({ error: 'error_interno' })
  }
})

rutasAuth.post('/auth/logout', async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)[COOKIE_REFRESH]
  const datos = token ? leerRefresh(token) : null

  if (datos) {
    try {
      await revocarSesion(datos.sid)
    } catch (error) {
      console.error('Error cerrando la sesión:', error)
    }
  }

  res.clearCookie(COOKIE_REFRESH, { path: '/api/auth' })
  res.json({ ok: true })
})

rutasAuth.get('/auth/yo', requiereSesion, async (req, res) => {
  res.json({ comensal: await aPublico(req.comensal!) })
})

// ── Confirmación de correo y teléfono ───────────────────────

rutasAuth.post('/cuenta/email/reenviar', requiereSesion, async (req, res) => {
  const fila = req.comensal!

  if (fila.email_verificado) {
    res.json({ ok: true, yaVerificado: true })
    return
  }

  const codigo = generarCodigo()
  await guardarCodigoEmail(fila.id, hashearCodigo(codigo), new Date(Date.now() + MINUTOS_15))

  if (enDesarrollo) console.log(`[desarrollo] Código de correo de ${fila.email}: ${codigo}`)
  res.json({ ok: true, ...(enDesarrollo ? { codigoDemo: codigo } : {}) })
})

rutasAuth.post('/cuenta/email/verificar', requiereSesion, async (req, res) => {
  const parseo = codigoSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'codigo_invalido' })
    return
  }

  const fila = req.comensal!
  const vencido = !fila.codigo_email_vence || fila.codigo_email_vence.getTime() < Date.now()

  if (vencido || !codigoCoincide(parseo.data.codigo, fila.codigo_email)) {
    res.status(400).json({
      error: vencido ? 'codigo_vencido' : 'codigo_invalido',
      mensaje: vencido ? 'El código venció. Pedí uno nuevo.' : 'Ese código no es correcto.',
    })
    return
  }

  await marcarEmailVerificado(fila.id)
  const actualizado = await porId(fila.id)
  res.json({ comensal: await aPublico(actualizado!) })
})

rutasAuth.post('/cuenta/telefono', requiereSesion, async (req, res) => {
  const parseo = telefonoSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({
      error: 'datos_invalidos',
      detalle: parseo.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    })
    return
  }

  const fila = req.comensal!
  const codigo = generarCodigo()

  try {
    await guardarTelefono(
      fila.id,
      // El número se guarda cifrado, nunca en texto legible (Anexo Técnico secc. 5).
      cifrarTelefono(parseo.data.telefono),
      hashearCodigo(codigo),
      new Date(Date.now() + MINUTOS_15),
    )

    if (enDesarrollo) console.log(`[desarrollo] Código de teléfono de ${fila.email}: ${codigo}`)

    const actualizado = await porId(fila.id)
    res.json({
      comensal: await aPublico(actualizado!),
      ...(enDesarrollo ? { codigoDemo: codigo } : {}),
    })
  } catch (error) {
    console.error('Error guardando el teléfono:', error)
    res.status(500).json({
      error: 'error_interno',
      mensaje:
        error instanceof Error && error.message.includes('TELEFONO_ENC_KEY')
          ? 'Falta configurar TELEFONO_ENC_KEY en el .env.'
          : undefined,
    })
  }
})

rutasAuth.post('/cuenta/telefono/verificar', requiereSesion, async (req, res) => {
  const parseo = codigoSchema.safeParse(req.body)
  if (!parseo.success) {
    res.status(400).json({ error: 'codigo_invalido' })
    return
  }

  const fila = req.comensal!
  const vencido = !fila.codigo_tel_vence || fila.codigo_tel_vence.getTime() < Date.now()

  if (vencido || !codigoCoincide(parseo.data.codigo, fila.codigo_tel)) {
    res.status(400).json({
      error: vencido ? 'codigo_vencido' : 'codigo_invalido',
      mensaje: vencido ? 'El código venció. Pedí uno nuevo.' : 'Ese código no es correcto.',
    })
    return
  }

  await marcarTelefonoVerificado(fila.id)
  const actualizado = await porId(fila.id)
  res.json({ comensal: await aPublico(actualizado!) })
})

export { COOKIE_REFRESH }
