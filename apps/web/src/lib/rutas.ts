/**
 * Rutas de pantalla declaradas en App.tsx, leídas de su código fuente. Las usan la prueba de humo
 * (Vitest) y el recorrido en navegador (Playwright): así una pantalla nueva queda cubierta por ambas
 * pruebas sin mantener una lista aparte. Se excluyen las rutas con parámetros (:clave), el comodín y
 * las que solo redirigen (<Navigate>).
 */
export function rutasDeApp(fuente: string): string[] {
  const rutas = new Set<string>();
  for (const m of fuente.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)) {
    const [, ruta, componente] = m;
    if (ruta.startsWith('/') && !ruta.includes(':') && componente !== 'Navigate') rutas.add(ruta);
  }
  return [...rutas];
}
