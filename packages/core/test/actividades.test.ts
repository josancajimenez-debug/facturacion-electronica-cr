import { describe, expect, it } from 'vitest';
import { ACTIVIDADES_CIIU4, REGEX_ACTIVIDAD_CIIU4, actividadCiiu4, buscarActividades } from '../src/actividades';
import { EMISOR_DEMO } from '../src/datos-demo';

describe('Actividades económicas CIIU 4', () => {
  it('el listado tiene códigos únicos con el formato de TRIBU-CR', () => {
    expect(ACTIVIDADES_CIIU4.length).toBeGreaterThan(300);
    expect(ACTIVIDADES_CIIU4.every((a) => REGEX_ACTIVIDAD_CIIU4.test(a.codigo) && a.descripcion.length > 5)).toBe(true);
    expect(new Set(ACTIVIDADES_CIIU4.map((a) => a.codigo)).size).toBe(ACTIVIDADES_CIIU4.length);
  });

  it('incluye las actividades del emisor de práctica', () => {
    for (const a of EMISOR_DEMO.actividades) expect(actividadCiiu4(a.codigo)?.descripcion).toBe(a.descripcion);
  });

  it('busca por palabras sin tildes, también en los nombres de ATV y especialidades', () => {
    const r = buscarActividades('repuestos');
    expect(r.map((a) => a.codigo)).toContain('4530.0');
    expect(r.find((a) => a.codigo === '4530.0')?.coincidencia).toMatch(/REPUESTOS/);
    const [contable] = buscarActividades('contabilidad auditorias');
    expect(contable.codigo).toBe('6920.0');
    expect(contable.coincidencia).toBeUndefined();
    expect(buscarActividades('panaderia').map((a) => a.codigo)).toContain('1071.9');
  });

  it('busca por código y descarta textos demasiado cortos', () => {
    expect(buscarActividades('4530').map((a) => a.codigo)).toEqual(['4530.0']);
    expect(buscarActividades('62').every((a) => a.codigo.startsWith('62'))).toBe(true);
    expect(buscarActividades('de')).toEqual([]);
  });
});
