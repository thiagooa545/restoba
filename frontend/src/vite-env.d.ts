/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Proveedor de teselas del mapa: 'esri' (por defecto) u 'osm'. Ninguno pide clave. */
  readonly VITE_MAPA_PROVEEDOR?: 'esri' | 'osm'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
