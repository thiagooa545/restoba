import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'

// El .env vive en la raíz del repo, no acá.
const RAIZ = resolve(import.meta.dirname, '..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, RAIZ, 'VITE_')

  return {
    envDir: RAIZ,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        // Todo lo que va a /api lo atiende la API en desarrollo,
        // así el navegador ve un solo origen y las cookies funcionan.
        '/api': {
          target: env.VITE_API_URL ?? 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
