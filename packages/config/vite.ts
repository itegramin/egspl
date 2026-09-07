import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, UserConfig } from 'vite';

export function defineAppViteConfig(options?: { alias?: Record<string, string> }): UserConfig {
  return defineConfig({
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        ...options?.alias,
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  });
}
