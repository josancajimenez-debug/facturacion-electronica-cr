import { describe, expect, it } from 'vitest';
import { REFERENCIAS, SIGLAS, TERMINOS, normalizar } from './glosario';

describe('glosario', () => {
  it('cada cita del texto tiene su referencia APA con el mismo autor y año', () => {
    const citas = TERMINOS.flatMap((t) => [...t.fuente.matchAll(/\(([^()]+?), (\d{4}[a-z]?)/g)]);
    expect(citas.length).toBeGreaterThan(TERMINOS.length - 1);
    for (const [, autor, anio] of citas) {
      const nombre = autor === 'DGT' ? 'Dirección General de Tributación' : autor;
      expect(REFERENCIAS.some((r) => r.texto.startsWith(`${nombre}. (${anio}`)), `${autor}, ${anio}`).toBe(true);
    }
  });

  it('términos y siglas en orden alfabético y sin repetir', () => {
    const orden = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b, 'es'));
    const terminos = TERMINOS.map((t) => t.termino);
    expect(terminos).toEqual(orden(terminos));
    expect(new Set(terminos).size).toBe(terminos.length);
    expect(SIGLAS.map(([s]) => s)).toEqual(orden(SIGLAS.map(([s]) => s)));
  });

  it('la búsqueda ignora tildes y mayúsculas', () => {
    expect(normalizar('Nota de CRÉDITO')).toBe('nota de credito');
  });
});
