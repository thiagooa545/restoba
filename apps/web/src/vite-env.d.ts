/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Proveedor de teselas del mapa: 'carto' (por defecto) u 'osm'. Ninguno pide clave. */
  readonly VITE_MAPA_PROVEEDOR?: 'carto' | 'osm'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
