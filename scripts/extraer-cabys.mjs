// Extrae el Catálogo de Bienes y Servicios (CAByS 2025, publicado por el BCCR el 1/4/2025)
// desde la conversión Markdown incluida en la bibliografía y genera un JSON compacto
// [codigo13, descripcion, impuesto] para la aplicación web.
//
// Uso: node scripts/extraer-cabys.mjs [ruta-al-md]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen =
  process.argv[2] ?? resolve(raiz, '..', 'Bibliogafía', '2025-04-01-catalogo-de-bienes-servicios-1.md');
const destino = resolve(raiz, 'apps/web/public/data/cabys-2025.json');

const texto = readFileSync(origen, 'utf8');
// Solo la primera hoja ("## Catálogo"); las siguientes son bitácoras de cambios.
const hoja = texto.split(/^## /m).find((s) => s.startsWith('Catálogo'));
if (!hoja) throw new Error('No se encontró la hoja "Catálogo" en el archivo de origen.');

const filas = [];
for (const linea of hoja.split('\n')) {
  if (!linea.startsWith('|')) continue;
  const celdas = linea.split('|').slice(1, -1).map((c) => c.trim());
  const codigo = celdas[16];
  if (!/^\d{13}$/.test(codigo ?? '')) continue;
  filas.push([codigo, celdas[17].replace(/\s+/g, ' '), celdas[18]]);
}

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(
  destino,
  JSON.stringify({
    fuente: 'Banco Central de Costa Rica – Catálogo de Bienes y Servicios (Cabys) 2025, publicado el 1 de abril de 2025',
    total: filas.length,
    codigos: filas,
  }),
);
console.log(`CAByS: ${filas.length} códigos escritos en ${destino}`);
