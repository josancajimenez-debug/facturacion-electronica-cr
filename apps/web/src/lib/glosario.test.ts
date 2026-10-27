import { describe, expect, it } from 'vitest';
import { PASOS } from './codigos';
import { REFERENCIAS, SIGLAS, TERMINOS, normalizar } from './glosario';

const CATALOGOS = PASOS.flatMap((p) => p.catalogos);

describe('glosario', () => {
  it('cada cita del texto y de los códigos tiene su referencia APA con el mismo autor y año', () => {
    const fuentes = [...TERMINOS.map((t) => t.fuente), ...CATALOGOS.map((c) => c.fuente)];
    const citas = fuentes.flatMap((f) => [...f.matchAll(/\(([^()]+?), (\d{4}[a-z]?|s\. f\.-[a-z])/g)]);
    expect(citas.length).toBeGreaterThan(fuentes.length - 1);
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

  it('ningún catálogo de códigos está vacío ni repite un código', () => {
    for (const c of CATALOGOS) {
      expect(c.codigos.length, c.titulo).toBeGreaterThan(0);
      expect(new Set(c.codigos.map((x) => x.codigo)).size, c.titulo).toBe(c.codigos.length);
    }
  });

  it('los tipos de comprobante van del 01 al 10 con su nombre', () => {
    const tipos = CATALOGOS.find((c) => c.titulo === 'Tipo de comprobante')!.codigos;
    expect(tipos.map((t) => t.codigo)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
    expect(tipos.find((t) => t.codigo === '10')?.descripcion).toBe('Recibo Electrónico de Pago (REP)');
  });

  it('la búsqueda ignora tildes y mayúsculas', () => {
    expect(normalizar('Nota de CRÉDITO')).toBe('nota de credito');
  });
});
