import { describe, expect, it } from 'vitest';
import {
  APENDICE_A,
  CAMBIOS_TERCERA_EDICION,
  EXCEPCIONES_35_9,
  EXENCIONES_35_10,
  conciliarPatrimonio,
  fechasTransicion,
  revisarTransicion,
  type AjusteTransicion,
} from '../src/transicion';

// Ajustes del caso «Comercial Andina» de la guía AIC-CILEA (conciliación del patrimonio al 1/01/2026).
const CASO: AjusteTransicion[] = [
  { ref: 'A-01', concepto: 'Diferimiento de la instalación', seccion: 23, naturaleza: 'reconocimiento', efecto: -8000 },
  { ref: 'A-02', concepto: 'Deterioro de cartera', seccion: 11, naturaleza: 'medicion', efecto: -12700 },
  { ref: 'A-03', concepto: 'Deterioro de inventarios', seccion: 13, naturaleza: 'medicion', efecto: -8500 },
  { ref: 'A-04', concepto: 'Recálculo de depreciación', seccion: 17, naturaleza: 'medicion', efecto: 18000, cambioEstimacion: true },
  { ref: 'A-05', concepto: 'Baja de gastos de constitución', seccion: 18, naturaleza: 'baja', efecto: -9000 },
  { ref: 'A-06', concepto: 'Arrendamiento financiero', seccion: 20, naturaleza: 'reconocimiento', efecto: -2177.65 },
  { ref: 'A-07', concepto: 'Jubilación patronal', seccion: 28, naturaleza: 'reconocimiento', efecto: -46000 },
  { ref: 'A-08', concepto: 'Propiedad de inversión a valor razonable', seccion: 16, naturaleza: 'medicion', efecto: 45000 },
  { ref: 'A-09', concepto: 'Impuesto diferido neto', seccion: 29, naturaleza: 'reconocimiento', efecto: 3594.41 },
];

describe('Transición a la NIIF para las PYMES, tercera edición', () => {
  it('lista completa de excepciones (35.9 a-g) y exenciones (35.10 a-o) de la Norma', () => {
    expect(EXCEPCIONES_35_9.map((e) => e.codigo).join('')).toBe('abcdefg');
    expect(EXENCIONES_35_10.map((e) => e.codigo).join('')).toBe('abcdefghijklmno');
    // Los préstamos del gobierno son una excepción obligatoria, no una exención optativa.
    expect(EXCEPCIONES_35_9.some((e) => /préstamos del gobierno/i.test(e.titulo))).toBe(true);
    expect(EXENCIONES_35_10.some((e) => /préstamos del gobierno/i.test(e.titulo))).toBe(false);
  });

  it('clasifica las 35 secciones; arrendamientos solo cambia de redacción', () => {
    expect(Object.keys(CAMBIOS_TERCERA_EDICION)).toHaveLength(35);
    expect(CAMBIOS_TERCERA_EDICION[20].naturaleza).toBe('redaccion');
    expect(CAMBIOS_TERCERA_EDICION[32].naturaleza).toBe('sin cambios');
    expect(APENDICE_A.find((a) => a.seccion === 19)?.tratamiento).toBe('prospectivo');
  });

  it('fechas: primera adopción usa el inicio del comparativo; el cambio de edición, la aplicación inicial', () => {
    expect(fechasTransicion('primera-adopcion', 2027)).toMatchObject({ fechaClave: '2026-01-01', cierrePrimerEjercicio: '2027-12-31', anticipada: false });
    expect(fechasTransicion('cambio-edicion', 2027)).toMatchObject({ fechaClave: '2027-01-01', inicioComparativo: '2026-01-01' });
    expect(fechasTransicion('primera-adopcion', 2026).anticipada).toBe(true);
  });

  it('concilia el patrimonio del caso de la guía (816 000,00 → 796 216,76)', () => {
    expect(conciliarPatrimonio(816000, CASO)).toEqual({ totalAjustes: -19783.24, patrimonioNiif: 796216.76 });
  });

  it('advierte que el recálculo de vidas útiles choca con el 35.9(c)', () => {
    const avisos = revisarTransicion({ modo: 'primera-adopcion', primerEjercicio: 2027, patrimonioAnterior: 816000, ajustes: CASO });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ nivel: 'advertencia', fuente: 'Sección 35, párrafo 35.9(c)' });
  });

  it('las exenciones del 35.10 no aplican a quien ya usaba la segunda edición; marco de Grandes Contribuyentes', () => {
    const avisos = revisarTransicion({ modo: 'cambio-edicion', primerEjercicio: 2027, granContribuyente: true, exenciones: { c: { aplica: true, justificacion: 'Sin registros' } } });
    expect(avisos.map((a) => a.nivel)).toEqual(['error', 'error']);
    expect(avisos[1].mensaje).toMatch(/Apéndice A/);
  });

  it('exige un primer ejercicio válido para la tercera edición', () => {
    expect(revisarTransicion({ modo: 'primera-adopcion', primerEjercicio: 202 })[0]).toMatchObject({ nivel: 'error', fuente: 'Apéndice A, Fecha de vigencia' });
    expect(revisarTransicion({ modo: 'primera-adopcion', primerEjercicio: 2027 })).toEqual([]);
    expect(fechasTransicion('primera-adopcion', 2027).cierreComparativo).toBe('2026-12-31');
  });
});
