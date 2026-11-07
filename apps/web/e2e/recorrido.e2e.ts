/**
 * Recorrido en navegador real: crea una cuenta local, carga los datos de práctica, emite una factura
 * desde el formulario y visita cada pantalla declarada en App.tsx. En cada una exige que cargue con
 * su título, sin errores de consola ni excepciones y sin desborde horizontal (en escritorio, tablet,
 * móvil y modo oscuro, según el proyecto de playwright.config.ts).
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { rutasDeApp } from '../src/lib/rutas';

const RUTAS = rutasDeApp(readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'));

/** Registra errores de consola, excepciones y solicitudes propias fallidas de la página. */
function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errores.push(`[consola] ${m.text()}`);
  });
  page.on('pageerror', (e) => errores.push(`[excepción] ${e.message}`));
  page.on('requestfailed', (r) => {
    // Los servicios externos (API de Hacienda) pueden no estar disponibles en CI; los propios no.
    if (r.url().startsWith('http://localhost')) errores.push(`[red] ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  return errores;
}

async function pantallaLista(page: Page) {
  const main = page.locator('main.content');
  await expect(main.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await expect(main.locator('.cargando')).toHaveCount(0, { timeout: 20_000 });
  await expect(main).not.toContainText('Ocurrió un error al mostrar esta página');
  await expect(main).not.toContainText('NaN');
  await expect(main).not.toContainText('undefined');
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde, 'desborde horizontal en px').toBeLessThanOrEqual(1);
}

test('cuenta, datos de práctica, emisión y todas las pantallas', async ({ page }, info) => {
  const errores = vigilar(page);
  // Cuenta local y datos de práctica.
  await page.goto('./');
  await page.getByRole('button', { name: '¿No tiene cuenta? Crear una' }).click();
  await page.getByLabel('Correo electrónico').fill(`recorrido-${info.project.name}@demo.test`);
  await page.getByLabel('Contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByRole('button', { name: 'Cargar datos ficticios' }).click();
  await expect(page.locator('main.content h1')).not.toHaveText('Bienvenida', { timeout: 20_000 });

  // Emisión desde el formulario: receptor y producto del catálogo, hasta la respuesta del simulador.
  await page.goto('./emitir');
  await pantallaLista(page);
  const receptor = page.getByLabel('Receptor registrado', { exact: false });
  await receptor.selectOption({ index: 1 });
  await page.getByLabel('Agregar producto del catálogo').selectOption({ index: 1 });
  const emitir = page.getByRole('button', { name: /Emitir y enviar/ });
  await expect(emitir).toBeEnabled();
  await emitir.click();
  await expect(page).toHaveURL(/\/comprobantes\/[0-9A-Z]{50}$/);
  await expect(page.locator('main.content')).toContainText('Aceptado', { timeout: 20_000 });

  for (const ruta of RUTAS) {
    await test.step(ruta, async () => {
      await page.goto(`.${ruta}`);
      await pantallaLista(page);
    });
  }
  expect(errores).toEqual([]);
});
