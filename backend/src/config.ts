import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const aca = dirname(fileURLToPath(import.meta.url))

/** Raíz del repositorio: backend/src → backend → raíz */
export const RAIZ = resolve(aca, '../..')

/** Carpeta con los documentos legales. Son la fuente de verdad: se leen, no se copian. */
export const DIR_LEGAL = resolve(RAIZ, 'legal')

/** Migraciones SQL numeradas. */
export const DIR_MIGRACIONES = resolve(RAIZ, 'infra/db/migrations')

dotenv.config({ path: resolve(RAIZ, '.env'), quiet: true })

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL. Copiá .env.example a .env.'),

  // Anexo Técnico secc. 3 — estos valores están declarados en un documento legal:
  // si cambian acá, hay que corregir el documento.
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).default(12),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-cambiar-en-produccion'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-cambiar-en-produccion'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Anexo Técnico secc. 5 — AES-256-GCM sobre el teléfono. 32 bytes en hexadecimal.
  TELEFONO_ENC_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'TELEFONO_ENC_KEY debe ser 64 caracteres hexadecimales').optional(),
})

const parseo = esquema.safeParse(process.env)

if (!parseo.success) {
  const detalle = parseo.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`).join('\n')
  console.error(`\nConfiguración inválida:\n${detalle}\n`)
  process.exit(1)
}

export const config = parseo.data
export const enDesarrollo = config.NODE_ENV === 'development'
