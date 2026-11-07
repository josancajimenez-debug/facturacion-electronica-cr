import { describe, expect, it, vi } from 'vitest';

// Cada consulta a PostgREST queda pendiente hasta que la prueba la resuelve, en el orden que elija.
const pendientes: ((filas: unknown[]) => void)[] = [];
let alCambiar: () => void = () => undefined;

vi.mock('../config', () => ({ config: { backend: 'supabase', supabase: { url: 'https://demo.supabase.co', anonKey: 'anon' } } }));
vi.mock('@supabase/supabase-js', () => {
  const consulta = (): unknown =>
    new Proxy(() => undefined, {
      get: (_o, prop) => (prop === 'then'
        ? (ok: (r: unknown) => void) => pendientes.push((filas) => ok({ data: filas, error: null }))
        : () => consulta()),
    });
  const canal = {
    on: (_t: string, _f: unknown, cb: () => void) => ((alCambiar = cb), canal),
    subscribe: () => canal,
  };
  return { createClient: () => ({ from: () => consulta(), channel: () => canal, removeChannel: async () => undefined }) };
});

const { SupabaseBackend } = await import('./supabase');

describe('SupabaseBackend: tiempo real', () => {
  it('una respuesta vieja que llega tarde no reemplaza a la más reciente', async () => {
    const vistos: string[] = [];
    const off = new SupabaseBackend().onComprobantes('e1', (lista) => vistos.push(lista.map((c) => c.estado).join()));
    await Promise.resolve();
    alCambiar(); // llega el cambio a «procesando»…
    alCambiar(); // …y enseguida el cambio a «aceptado»
    await new Promise((r) => setTimeout(r, 0));
    expect(pendientes).toHaveLength(3);
    const [inicial, procesando, aceptado] = pendientes;
    aceptado([{ datos: { estado: 'aceptado' } }]);
    procesando([{ datos: { estado: 'procesando' } }]); // respuesta lenta, ya superada
    inicial([{ datos: { estado: 'enviado' } }]);
    await new Promise((r) => setTimeout(r, 0));
    expect(vistos).toEqual(['aceptado']);
    off();
  });
});
