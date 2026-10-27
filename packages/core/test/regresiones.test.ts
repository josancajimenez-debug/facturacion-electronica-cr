import { describe, expect, it } from 'vitest';
import { calcularComprobante } from '../src/calculos';
import { validarClave } from '../src/clave';
import { EMISOR_DEMO } from '../src/datos-demo';
import { construirComprobante } from '../src/emision';
import { validarComoHacienda } from '../src/simulador';
import type { BorradorComprobante, Referencia } from '../src/tipos';
import { extraerDatosComprobante, montoRecibidoEnColones } from '../src/recepcion';
import { validarBorrador } from '../src/validaciones';
import { borrador, linea } from './helpers';

/** Errores corregidos en la revisión integral; cada caso falla con el código anterior. */
const CLAVE = '50623102600010123045600100001010000000025112345678';
const ref = (extra: Partial<Referencia>): Referencia => ({ tipoDoc: '01', numero: CLAVE, fechaEmision: '2026-09-15T08:00:00-06:00', codigo: '04', razon: 'Referencia de prueba', ...extra });
const ANTES = new Date('2026-10-31T23:30:00-06:00');
const DESPUES = new Date('2026-11-01T00:30:00-06:00');
const errores = (b: Partial<BorradorComprobante>, ahora: Date) =>
  validarBorrador(borrador(b), EMISOR_DEMO, undefined, undefined, ahora).filter((v) => v.nivel === 'error').map((v) => v.mensaje);

describe('Regresiones de la revisión integral', () => {
  it('validarBorrador decide la vigencia con la fecha recibida, no con el reloj del sistema', () => {
    const rep = { tipo: 'REP' as const, condicionVenta: '11', referencias: [ref({ codigo: '04' })] };
    expect(errores(rep, ANTES).some((m) => m.includes('código 17'))).toBe(false);
    expect(errores(rep, DESPUES).some((m) => m.includes('código 17'))).toBe(true);
  });

  it('el simulador aplica las reglas vigentes en su fecha (ctx.ahora)', () => {
    const b = borrador({ tipo: 'REP', condicionVenta: '11', mediosPago: [{ tipo: '04' }], referencias: [ref({ codigo: '04' })] });
    const c = construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: 1, ambiente: 'simulacion', fecha: ANTES });
    expect(validarComoHacienda(c, { ahora: ANTES }).estado).toBe('aceptado');
    const despues = validarComoHacienda(c, { ahora: new Date(ANTES.getTime() + 60 * 60_000) });
    expect(despues.estado).toBe('rechazado');
    expect(despues.detalle.join(' ')).toMatch(/código 17/);
  });

  it('el REP puede referenciar un comprobante tipo 10 con el código 17 sin exigir el 16', () => {
    const m = errores({ tipo: 'REP', condicionVenta: '11', referencias: [ref({ tipoDoc: '10', codigo: '17' })] }, DESPUES);
    expect(m.some((x) => x.includes('código 16'))).toBe(false);
  });

  it('una nota de crédito o débito no puede ajustar un comprobante rechazado (tipo 10)', () => {
    for (const tipo of ['NC', 'ND'] as const) {
      expect(errores({ tipo, referencias: [ref({ tipoDoc: '10', codigo: '01' })] }, ANTES).some((x) => x.includes('rechazado'))).toBe(true);
    }
  });

  it('el IVA devuelto de salud no incluye otros impuestos de la línea ni lo exonerado', () => {
    const salud = linea({ codigoCabys: '9310100000100', detalle: 'Consulta médica', precioUnitario: 30000, codigoTarifaIva: '04', servicioSalud: true });
    const conOtro = calcularComprobante(borrador({ lineas: [{ ...salud, impuestosAdicionales: [{ codigo: '99', codigoOtro: 'Tasa municipal', tarifa: 10 }] }], mediosPago: [{ tipo: '02' }] }));
    expect(conOtro.resumen.totalIVADevuelto).toBe(1200); // solo el 4 % de 30 000
    const exonerada = calcularComprobante(borrador({
      lineas: [{ ...salud, exoneracion: { tipoDocumento: '04', numeroDocumento: 'AL-00000001-25', institucion: '01', fechaEmision: '2026-01-10T08:00:00-06:00', tarifaExonerada: 4 } }],
      mediosPago: [{ tipo: '02' }],
    }));
    expect(exonerada.resumen.totalIVADevuelto).toBe(0);
  });

  it('la clave rechaza fechas que no existen en el calendario', () => {
    const conFecha = (dd: string, mm: string, aa: string) => `506${dd}${mm}${aa}${CLAVE.slice(9)}`;
    expect(validarClave(conFecha('31', '02', '26'))).toContain('La fecha contenida en la clave no es válida.');
    expect(validarClave(conFecha('29', '02', '28'))).not.toContain('La fecha contenida en la clave no es válida.');
    expect(validarClave(conFecha('29', '02', '27'))).toContain('La fecha contenida en la clave no es válida.');
  });
});

describe('Regresiones de la tercera revisión integral', () => {
  it('lee el tipo de cambio del comprobante recibido y convierte sus montos a colones', () => {
    const b = borrador({ moneda: 'USD', tipoCambio: 505.25, lineas: [linea({ precioUnitario: 100 })] });
    const c = construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: 1, ambiente: 'simulacion' });
    const r = extraerDatosComprobante(c.xml);
    expect(r.moneda).toBe('USD');
    expect(r.tipoCambio).toBe(505.25);
    expect(montoRecibidoEnColones(r, r.totalImpuesto)).toBeCloseTo(r.totalImpuesto * 505.25, 5);
    expect(montoRecibidoEnColones({ moneda: 'CRC' }, 1300)).toBe(1300);
    // Un registro viejo en dólares sin tipo de cambio no se suma como si fueran colones.
    expect(montoRecibidoEnColones({ moneda: 'USD' }, 13)).toBeNull();
  });
});
