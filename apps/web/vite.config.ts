/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // En GitHub Pages el sitio vive en /<repositorio>/; VITE_BASE lo fija el flujo de despliegue.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'qrcode'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
