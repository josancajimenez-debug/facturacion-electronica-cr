// Prepara supabase/functions/_shared/ para el despliegue de la función Edge:
//  - core.js: el paquete @fe-cr/core empaquetado como un único módulo ESM (incluye decimal.js).
//  - cabys-codigos.json: lista de códigos CAByS 2025 para la validación de nivel 3.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, 'functions/_shared');
mkdirSync(destino, { recursive: true });

await build({
  entryPoints: [resolve(aqui, '../packages/core/src/index.ts')],
  outfile: resolve(destino, 'core.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  banner: { js: '// Archivo generado por supabase/construir-edge.mjs a partir de packages/core. No editar.' },
});

const cabys = JSON.parse(readFileSync(resolve(aqui, '../apps/web/public/data/cabys-2025.json'), 'utf8'));
writeFileSync(resolve(destino, 'cabys-codigos.json'), JSON.stringify(cabys.codigos.map((c) => c[0])));

console.log('Función Edge preparada en', destino);
