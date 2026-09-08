/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DASHBOARD_URL?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly VITE_AUTH_COOKIE_DOMAIN?: string;
    readonly VITE_AUTH_STORAGE_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}