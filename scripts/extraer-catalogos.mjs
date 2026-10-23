// Genera packages/core/src/datos/*.json a partir de fuentes oficiales:
//  1. División Territorial Administrativa 2022 (Registro Nacional – IGN), conversión Markdown en la bibliografía.
//  2. CodeSystem FHIR "drugs-presentation-code" del Ministerio de Salud (formas farmacéuticas).
//
// Uso: node scripts/extraer-catalogos.mjs [ruta-dta.md]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'packages/core/src/datos');
mkdirSync(destino, { recursive: true });

// ---------- 1. División territorial ----------
const rutaDta = process.argv[2] ?? resolve(raiz, '..', 'Bibliogafía', 'DTA-TABLA-POR-PROVINCIA-CANTON-DISTRITO-2022V3.md');
const texto = readFileSync(rutaDta, 'utf8').replace(/\s+/g, ' ').trim();
const re = /160105 (\d) (.+?) (\d{3}) (.+?) (\d{5}) (.+?) (\d+(?:\.\d+)?)(?= 160105| TABLA| CÓDIGO| ##|$)/g;
const provincias = new Map();
let m;
let distritos = 0;
while ((m = re.exec(texto))) {
  const [, p, prov, c, canton, d, distrito] = m;
  if (!provincias.has(p)) provincias.set(p, { codigo: p, nombre: prov.trim(), cantones: new Map() });
  const cantones = provincias.get(p).cantones;
  if (!cantones.has(c)) cantones.set(c, { codigo: c.slice(1), nombre: canton.trim(), distritos: [] });
  cantones.get(c).distritos.push({ codigo: d.slice(3), nombre: distrito.trim() });
  distritos++;
}
const dta = {
  fuente: 'Registro Nacional – Instituto Geográfico Nacional. División Territorial Administrativa, 2022 (tabla por provincia, cantón y distrito, v3)',
  provincias: [...provincias.values()].map((p) => ({ ...p, cantones: [...p.cantones.values()] })),
};
writeFileSync(resolve(destino, 'division-territorial.json'), JSON.stringify(dta));
console.log(`DTA: ${dta.provincias.length} provincias, ${dta.provincias.reduce((s, p) => s + p.cantones.length, 0)} cantones, ${distritos} distritos`);

// ---------- 2. Formas farmacéuticas (Ministerio de Salud, FHIR) ----------
const URL_MINSA = 'https://www.ministeriodesalud.go.cr/fhir/receta/CodeSystem-drugs-presentation-code.json';
const resp = await fetch(URL_MINSA);
if (!resp.ok) throw new Error(`Ministerio de Salud respondió ${resp.status}`);
const cs = await resp.json();
const formas = {
  fuente: `${cs.publisher ?? 'Ministerio de Salud de Costa Rica'} – CodeSystem ${cs.name} (${cs.url}), versión ${cs.version}, estado ${cs.status}`,
  consultado: new Date().toISOString().slice(0, 10),
  codigos: cs.concept.map((c) => ({ codigo: c.code, descripcion: c.display })),
};
writeFileSync(resolve(destino, 'formas-farmaceuticas-minsa.json'), JSON.stringify(formas, null, 1));
console.log(`Formas farmacéuticas: ${formas.codigos.length} conceptos (${cs.version}, ${cs.status})`);
