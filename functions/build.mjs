// Empaqueta las funciones con esbuild en functions/deploy/, incluyendo @fe-cr/core,
// y genera un package.json mínimo para el despliegue (solo dependencias de ejecución).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = resolve(aqui, 'deploy');
const pkg = JSON.parse(readFileSync(resolve(aqui, 'package.json'), 'utf8'));

mkdirSync(salida, { recursive: true });
await build({
  entryPoints: [resolve(aqui, 'src/index.ts')],
  outfile: resolve(salida, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions'],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
});

copyFileSync(resolve(aqui, '../apps/web/public/data/cabys-2025.json'), resolve(salida, 'cabys-2025.json'));
writeFileSync(
  resolve(salida, 'package.json'),
  JSON.stringify(
    {
      name: 'fe-cr-functions-deploy',
      private: true,
      type: 'module',
      main: 'index.js',
      engines: pkg.engines,
      dependencies: pkg.dependencies,
    },
    null,
    2,
  ),
);
console.log('Functions empaquetadas en', salida);
