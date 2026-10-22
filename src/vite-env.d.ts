/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** "true" starts the MSW browser worker in dev so the UI runs without the API. */
  readonly VITE_API_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
