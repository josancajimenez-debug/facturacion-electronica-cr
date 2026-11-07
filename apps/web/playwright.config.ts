import { defineConfig, devices } from '@playwright/test';

/**
 * Recorrido en navegador real (Chromium) sobre la compilación de producción en modo local.
 * Requiere `npm run build` antes; `npm run e2e -w apps/web` lo ejecuta.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  timeout: 180_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'movil', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true } },
    { name: 'oscuro', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 }, colorScheme: 'dark' } },
  ],
  webServer: {
    // Modo local: sin variables VITE_SUPABASE_* la compilación usa el backend del navegador.
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
