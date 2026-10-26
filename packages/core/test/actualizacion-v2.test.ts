import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizacionVigente, diferenciasConReferencia, excesosNotaCredito, periodoContable, type DocumentoResumen } from '../src/actualizacion';
import { calcularComprobante } from '../src/calculos';
import { REGEX_CLAVE, descomponerClave, generarClave, generarConsecutivo, validarClave } from '../src/clave';
import { EMISOR_DEMO } from '../src/datos-demo';
import { extraerDatosComprobante } from '../src/recepcion';
import { construirComprobante } from '../src/emision';
import { validarComoHacienda, verificarSecuencia } from '../src/simulador';
import type { BorradorComprobante, Referencia } from '../src/tipos';
import { validarBorrador, validarIdentificacion } from '../src/validaciones';
import { borrador, linea } from './helpers';

const CLAVE = '50623102600010123045600100001010000000025112345678';
const ref = (extra: Partial<Referencia>): Referencia => ({ tipoDoc: '01', numero: CLAVE, fechaEmision: '2026-09-15T08:00:00-06:00', codigo: '04', razon: 'Referencia de prueba', ...extra });
const mensajes = (b: Partial<BorradorComprobante>, nivel: 'error' | 'advertencia', campo = 'referencias.0') =>
  validarBorrador(borrador(b), EMISOR_DEMO).filter((v) => v.nivel === nivel && v.campo === campo).map((v) => v.mensaje).join(' | ');

const ANTES = new Date('2026-10-31T23:30:00-06:00');
const DESPUES = new Date('2026-11-01T00:30:00-06:00');

describe('Actualización Anexos y Estructuras v4.4 (vigente el 1/11/2026)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('la vigencia cambia a la medianoche de Costa Rica', () => {
    expect(actualizacionVigente(ANTES)).toBe(false);
    expect(actualizacionVigente(new Date('2026-11-01T05:59:00Z'))).toBe(false);
    expect(actualizacionVigente(new Date('2026-11-01T06:00:00Z'))).toBe(true);
  });

  it('cédula jurídica de 10 caracteres alfanuméricos y clave con letras', () => {
    expect(validarIdentificacion({ tipo: '02', numero: '3101123456' })).toBeNull();
    expect(validarIdentificacion({ tipo: '02', numero: '3A01B23456' })).toBeNull();
    expect(validarIdentificacion({ tipo: '02', numero: '3a01b23456' })).toMatch(/10 caracteres/);
    expect(validarIdentificacion({ tipo: '02', numero: '310112345' })).toMatch(/10 caracteres/);

    const clave = generarClave({
      fecha: DESPUES, identificacion: { tipo: '02', numero: '3A01B23456' },
      consecutivo: generarConsecutivo('001', '00001', 'FE', 1), situacion: '1', codigoSeguridad: '12345678',
    });
    expect(clave).toMatch(REGEX_CLAVE);
    expect(descomponerClave(clave)?.identificacion).toBe('003A01B23456');
    expect(validarClave(clave)).toEqual([]);
    expect(validarClave('x'.repeat(50))[0]).toMatch(/50 posiciones/);
  });

  it('un emisor con cédula alfanumérica emite y el XML se puede recibir', () => {
    vi.setSystemTime(DESPUES);
    const emisor = { ...EMISOR_DEMO, identificacion: { tipo: '02' as const, numero: '3A01B23456' } };
    const c = construirComprobante({ borrador: borrador(), emisor, numero: 7, ambiente: 'simulacion', fecha: DESPUES });
    expect(c.clave.slice(9, 21)).toBe('003A01B23456');
    expect(extraerDatosComprobante(c.xml).clave).toBe(c.clave);
  });

  it('REP: tipos de documento 02 y 03 advierten antes y se rechazan después; 07, 10 y 20 se admiten', () => {
    const rep = (tipoDoc: string): Partial<BorradorComprobante> => ({ tipo: 'REP', condicionVenta: '11', referencias: [ref({ tipoDoc, codigo: '17' })] });
    vi.setSystemTime(ANTES);
    expect(mensajes(rep('03'), 'error')).toBe('');
    expect(mensajes(rep('03'), 'advertencia')).toMatch(/ya no puede referenciar/);
    expect(mensajes(rep('20'), 'advertencia')).toMatch(/voluntario/);
    vi.setSystemTime(DESPUES);
    expect(mensajes(rep('03'), 'error')).toMatch(/ya no puede referenciar/);
    expect(mensajes(rep('20'), 'error')).toBe('');
    expect(mensajes(rep('05'), 'error')).toMatch(/solo se permiten/);
  });

  it('tipos de documento 17-20: la clave del referenciado es obligatoria desde la vigencia', () => {
    const nc = { tipo: 'NC' as const, referencias: [ref({ tipoDoc: '19', numero: 'EXP-001', codigo: '01' })] };
    vi.setSystemTime(ANTES);
    expect(mensajes(nc, 'error')).toBe('');
    expect(mensajes(nc, 'advertencia')).toMatch(/clave de 50 posiciones/);
    vi.setSystemTime(DESPUES);
    expect(mensajes(nc, 'error')).toMatch(/clave de 50 posiciones/);
    expect(mensajes({ ...nc, referencias: [ref({ tipoDoc: '19', codigo: '01' })] }, 'error')).toBe('');
  });

  it('las reglas de 13-16 citan el Reglamento y la RES-0027', () => {
    vi.setSystemTime(ANTES);
    const v = validarBorrador(borrador({ referencias: [ref({ codigo: '13' })] }), EMISOR_DEMO).find((x) => x.campo === 'referencias.0' && x.nivel === 'error');
    expect(v?.fuente).toMatch(/44739-H art\. 10/);
    expect(v?.fuente).toMatch(/RES-0027/);
  });

  it('códigos 13 y 14: advertencia y período contable del comprobante original', () => {
    vi.setSystemTime(DESPUES);
    expect(mensajes({ tipo: 'NC', referencias: [ref({ codigo: '13' })] }, 'advertencia')).toMatch(/período del comprobante que se modifica \(09\/2026\)/);
    const nota = (codigo: string) => ({ tipo: 'NC' as const, fechaEmision: '2026-11-05T10:00:00-06:00', borrador: { referencias: [ref({ codigo })] } });
    expect(periodoContable(nota('13'))).toBe('2026-09');
    expect(periodoContable(nota('14'))).toBe('2026-09');
    expect(periodoContable(nota('01'))).toBe('2026-11');
    expect(periodoContable({ ...nota('13'), tipo: 'FE' })).toBe('2026-11');
  });

  it('código 12 solo en notas de crédito; las reglas citan el Anexo actualizado', () => {
    vi.setSystemTime(DESPUES);
    expect(mensajes({ tipo: 'ND', referencias: [ref({ codigo: '12' })] }, 'error')).toMatch(/solo se usa en notas de crédito/);
    expect(mensajes({ tipo: 'NC', referencias: [ref({ codigo: '12' })] }, 'error')).toBe('');
    const v = validarBorrador(borrador({ tipo: 'FE', referencias: [ref({ codigo: '17' })] }), EMISOR_DEMO).find((x) => x.campo === 'referencias.0');
    expect(v?.fuente).toMatch(/22\/04\/2026/);
  });

  it('IVA devuelto con la fórmula del Anexo actualizado', () => {
    const salud = linea({ codigoCabys: '9310100000100', detalle: 'Consulta médica', precioUnitario: 30000, codigoTarifaIva: '04', servicioSalud: true });
    const otro = linea({ precioUnitario: 10000 });
    // Solo salud, todo con tarjeta: se devuelve el IVA completo.
    expect(calcularComprobante(borrador({ lineas: [salud], mediosPago: [{ tipo: '02' }] })).resumen.totalIVADevuelto).toBe(1200);
    // Salud + otro servicio con varios medios: (tarjeta / venta neta) × IVA de salud al 4 %.
    const mixto = calcularComprobante(borrador({ lineas: [salud, otro], mediosPago: [{ tipo: '02', monto: 20000 }, { tipo: '01', monto: 22100 }] })).resumen;
    expect(mixto.totalIVADevuelto).toBe(600); // 20 000 / 40 000 × 1 200
    // Sin tarjeta no hay devolución; la salud a otra tarifa no cuenta.
    expect(calcularComprobante(borrador({ lineas: [salud], mediosPago: [{ tipo: '01' }] })).resumen.totalIVADevuelto).toBe(0);
    expect(calcularComprobante(borrador({ lineas: [{ ...salud, codigoTarifaIva: '08' }], mediosPago: [{ tipo: '02' }] })).resumen.totalIVADevuelto).toBe(0);
  });

  it('tipo de cambio en moneda extranjera: advertencia de referencia del BCCR', () => {
    expect(mensajes({ moneda: 'USD', tipoCambio: 505.5 }, 'advertencia', 'tipoCambio')).toMatch(/BCCR/);
    expect(mensajes({}, 'advertencia', 'tipoCambio')).toBe('');
  });
});

describe('Numeración consecutiva (RES-0027 art. 2; nota 3)', () => {
  const cons = (n: number, prefijo = '0010000101') => prefijo + String(n).padStart(10, '0');

  it('detecta consecutivos repetidos y números faltantes por sucursal, terminal y tipo', () => {
    expect(verificarSecuencia(cons(1), [])).toEqual({ duplicado: false, faltantes: 0 });
    expect(verificarSecuencia(cons(3), [cons(1), cons(2)])).toEqual({ duplicado: false, faltantes: 0 });
    expect(verificarSecuencia(cons(2), [cons(1), cons(2)]).duplicado).toBe(true);
    expect(verificarSecuencia(cons(5), [cons(1), cons(2)]).faltantes).toBe(2);
    // Otra terminal u otro tipo llevan su propia numeración.
    expect(verificarSecuencia(cons(1, '0010000201'), [cons(1), cons(2)])).toEqual({ duplicado: false, faltantes: 0 });
  });

  it('el simulador rechaza un consecutivo repetido y advierte saltos', () => {
    const c = construirComprobante({ borrador: borrador(), emisor: EMISOR_DEMO, numero: 4, ambiente: 'simulacion', fecha: new Date() });
    const repetido = validarComoHacienda(c, { consecutivosEmitidos: [c.consecutivo] });
    expect(repetido.estado).toBe('rechazado');
    expect(repetido.detalle.join(' ')).toMatch(/ya fue utilizado/);
    const salto = validarComoHacienda(c, { consecutivosEmitidos: [c.consecutivo.slice(0, 10) + '0000000001'] });
    expect(salto.estado).toBe('aceptado');
    expect(salto.advertencias.join(' ')).toMatch(/faltan 2 número/);
  });

  it('la sucursal y la terminal deben estar registradas en el emisor', () => {
    expect(mensajes({ sucursal: '009' }, 'error', 'sucursal')).toMatch(/no está registrada/);
    expect(mensajes({ sucursal: '002', terminal: '00002' }, 'error', 'terminal')).toMatch(/no está registrada en la sucursal 002/);
    expect(mensajes({ sucursal: '001', terminal: '00002' }, 'error', 'terminal')).toBe('');
  });
});

describe('Datos de la nota frente al comprobante referenciado', () => {
  const fe: DocumentoResumen = { clave: 'FE1', tipo: 'FE', totalCRC: 1000, referencias: [], moneda: 'CRC', tipoCambio: 1, cabys: ['8222100000000'] };
  it('advierte diferencias de moneda, tipo de cambio y CAByS', () => {
    const nc = (extra: Partial<DocumentoResumen>): DocumentoResumen => ({ clave: 'NC1', tipo: 'NC', totalCRC: 100, referencias: ['FE1'], moneda: 'CRC', tipoCambio: 1, cabys: ['8222100000000'], ...extra });
    expect(diferenciasConReferencia(nc({}), [fe])).toEqual([]);
    expect(diferenciasConReferencia(nc({ moneda: 'USD', tipoCambio: 505 }), [fe])[0]).toMatch(/moneda/);
    expect(diferenciasConReferencia(nc({ cabys: ['9999999999999'] }), [fe])[0]).toMatch(/CAByS 9999999999999/);
    expect(diferenciasConReferencia({ ...nc({}), tipo: 'FE' }, [fe])).toEqual([]);
  });
});

describe('Límite de la nota de crédito (saldo acreditable)', () => {
  const doc = (clave: string, tipo: DocumentoResumen['tipo'], totalCRC: number, referencias: string[] = []): DocumentoResumen => ({ clave, tipo, totalCRC, referencias });
  const fe = doc('FE1', 'FE', 1000);

  it('compara contra lo facturado más ND menos NC previas', () => {
    expect(excesosNotaCredito(doc('NC1', 'NC', 1000, ['FE1']), [fe])).toEqual([]);
    expect(excesosNotaCredito(doc('NC1', 'NC', 1000.01, ['FE1']), [fe])).toEqual([{ clave: 'FE1', disponible: 1000 }]);
    expect(excesosNotaCredito(doc('NC2', 'NC', 700, ['FE1']), [fe, doc('NC1', 'NC', 400, ['FE1'])])).toEqual([{ clave: 'FE1', disponible: 600 }]);
    expect(excesosNotaCredito(doc('NC2', 'NC', 700, ['FE1']), [fe, doc('NC1', 'NC', 400, ['FE1']), doc('ND1', 'ND', 200, ['FE1'])])).toEqual([]);
    expect(excesosNotaCredito(doc('NC1', 'NC', 5000, ['EXTERNO']), [fe])).toEqual([]);
  });

  it('el simulador advierte antes del 1/11/2026 y rechaza desde esa fecha', () => {
    const fact = construirComprobante({ borrador: borrador(), emisor: EMISOR_DEMO, numero: 1, ambiente: 'simulacion', fecha: ANTES });
    const b = borrador({ tipo: 'NC', lineas: borrador().lineas.map((l) => ({ ...l, cantidad: 2 })), referencias: [ref({ numero: fact.clave, codigo: '02', fechaEmision: fact.fechaEmision })] });
    const aceptados = [{ clave: fact.clave, tipo: 'FE' as const, totalCRC: fact.resumen.totalComprobante, referencias: [] }];

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(ANTES);
    const nc1 = construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: 2, ambiente: 'simulacion', fecha: ANTES });
    const r1 = validarComoHacienda(nc1, { documentosAceptados: aceptados, ahora: ANTES });
    expect(r1.estado).toBe('aceptado');
    expect(r1.advertencias.join(' ')).toMatch(/saldo acreditable/);

    vi.setSystemTime(DESPUES);
    const nc2 = construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: 3, ambiente: 'simulacion', fecha: DESPUES });
    const r2 = validarComoHacienda(nc2, { documentosAceptados: aceptados, ahora: DESPUES });
    expect(r2.estado).toBe('rechazado');
    expect(r2.detalle.join(' ')).toMatch(/saldo acreditable/);
    vi.useRealTimers();
  });
});
