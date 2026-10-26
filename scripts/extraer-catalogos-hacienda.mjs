// Genera packages/core/src/datos/*.json a partir de las tablas oficiales de Hacienda publicadas en la
// OVi de TRIBU-CR (conversión Markdown en la bibliografía):
//  1. «Codigodemoneda_V4.4» (nota 13.1 del Anexo 1): códigos ISO 4217 admitidos en CodigoMoneda.
//  2. «Código de forma farmacéutica» (nota 19): códigos del campo FormaFarmaceutica (String 3).
//
// Uso: node scripts/extraer-catalogos-hacienda.mjs [carpeta-bibliografia]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const biblio = process.argv[2] ?? resolve(raiz, '..', 'Bibliogafía');
const destino = resolve(raiz, 'packages/core/src/datos');
mkdirSync(destino, { recursive: true });

// ---------- 1. Monedas ----------
// Los campos de cada fila («PAÍS   Nombre de la moneda   XXX») están separados por dos o más
// espacios; las filas sin moneda («Sin moneda universal») no tienen código. Un código puede
// repetirse en varios países: se conserva el primer nombre.
const campos = readFileSync(resolve(biblio, 'Codigodemoneda_V4-4.md'), 'utf8')
  .replace(/## Página \d+/g, '   ')
  .replace(/CÓDIGOMONEDA|NOMBRE DEL PAÍS|NOMBRE DE LA MODENA/g, '   ')
  .split(/\s{2,}|\n/)
  .map((s) => s.trim())
  .filter(Boolean);
const monedas = new Map();
campos.forEach((campo, i) => {
  if (/^[A-Z]{3}$/.test(campo) && i > 0 && !monedas.has(campo)) monedas.set(campo, campos[i - 1]);
});
const primero = ['CRC', 'USD', 'EUR'];
const codigosMoneda = [...monedas.entries()]
  .map(([codigo, descripcion]) => ({ codigo, descripcion }))
  .sort((a, b) => {
    const ia = primero.indexOf(a.codigo);
    const ib = primero.indexOf(b.codigo);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.codigo.localeCompare(b.codigo);
  });
writeFileSync(
  resolve(destino, 'monedas-hacienda.json'),
  JSON.stringify({ fuente: 'Ministerio de Hacienda – Codigodemoneda_V4.4 (nota 13.1, Anexos y Estructuras v4.4)', codigos: codigosMoneda }, null, 1),
);
console.log(`Monedas: ${codigosMoneda.length} códigos`);

// ---------- 2. Formas farmacéuticas ----------
const filas = readFileSync(resolve(biblio, 'Nota_9_Codigo_Forma_Farmaceutica.md'), 'utf8')
  .split('\n')
  .map((l) => l.match(/^\|\s*(\d{1,3})\s*\|\s*(.+?)\s*\|$/))
  .filter(Boolean)
  .map(([, codigo, descripcion]) => ({ codigo, descripcion: descripcion.replace(/\s+/g, ' ') }));
writeFileSync(
  resolve(destino, 'formas-farmaceuticas-hacienda.json'),
  JSON.stringify({ fuente: 'Ministerio de Hacienda – Código de forma farmacéutica (nota 19, Anexos y Estructuras v4.4)', codigos: filas }, null, 1),
);
console.log(`Formas farmacéuticas (Hacienda): ${filas.length} códigos`);
