/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_AUTH_URL?: string;
  readonly VITE_DASHBOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}