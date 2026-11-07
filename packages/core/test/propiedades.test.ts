/**
 * Pruebas de propiedades: cientos de comprobantes generados al azar (semilla fija, reproducible)
 * deben cumplir los invariantes de cálculo, de validación y de partida doble.
 */
import { describe, expect, it } from 'vitest';
import { completarLibro, parametrosPredeterminados } from '../src/cierre';
import { documentoDesdeComprobante, generarAsiento, generarLibroDiario, Kardex, POLITICAS_PREDETERMINADAS } from '../src/contabilidad';
import { contextoSimuladorDemo, EMISOR_DEMO, RECEPTORES_DEMO } from '../src/datos-demo';
import { construirComprobante, ErrorValidacion } from '../src/emision';
import { ivaDiferidoDelPeriodo, RegistroIvaDiferido } from '../src/ivaDiferido';
import { estadosFinancieros } from '../src/libros';
import { validarComoHacienda } from '../src/simulador';
import type { BorradorComprobante, Comprobante, LineaBorrador } from '../src/tipos';
import { borrador, linea, receptor } from './helpers';

/** Generador congruencial (mulberry32): mismos casos en cada ejecución. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { r, ent: (min: number, max: number) => min + Math.floor(r() * (max - min + 1)), de: <T>(xs: T[]) => xs[Math.floor(r() * xs.length)] };
}

const PRODUCTOS = [
  { codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad', unidadMedida: 'Sp' },
  { codigoCabys: '4523000990000', detalle: 'Computadora de escritorio', unidadMedida: 'Unid' },
  { codigoCabys: '2391102010200', detalle: 'Café tostado molido 1 kg', unidadMedida: 'Unid' },
  { codigoCabys: '3221000000000', detalle: 'Libro de texto escolar impreso', unidadMedida: 'Unid' },
];
const exonerada = RECEPTORES_DEMO.find((r) => r.id === 'rec-exonerada')!;

function caso(g: ReturnType<typeof azar>): BorradorComprobante {
  const moneda = g.r() < 0.25 ? 'USD' : 'CRC';
  const conExoneracion = g.r() < 0.15;
  const lineas: LineaBorrador[] = Array.from({ length: g.ent(1, 6) }, () => {
    const p = g.de(PRODUCTOS);
    const cantidad = g.de([1, 2, 3, 0.5, 1.25, 7, 12.333]);
    const precio = moneda === 'USD' ? g.ent(1, 300000) / 100 : g.ent(1, 2_000_000) / g.de([1, 1, 100]);
    const tarifa = g.de(['08', '08', '08', '04', '03', '02', '09', '10', '01', '11']);
    const descuentos = g.r() < 0.35 ? [{ codigo: g.de(['01', '06', '07']), porcentaje: g.ent(1, 60) }] : [];
    return {
      ...p,
      cantidad,
      precioUnitario: precio,
      descuentos,
      codigoTarifaIva: conExoneracion ? '08' : tarifa,
      ...(conExoneracion ? { exoneracion: exonerada.exoneracion } : {}),
    };
  });
  const tipo = g.de(['FE', 'FE', 'TE'] as const);
  const credito = tipo === 'FE' && g.r() < 0.4;
  return borrador({
    tipo,
    contraparte: conExoneracion ? receptor('rec-exonerada') : tipo === 'TE' && g.r() < 0.5 ? undefined : receptor('rec-distribuidora'),
    moneda,
    tipoCambio: moneda === 'USD' ? g.ent(48000, 53000) / 100 : 1,
    condicionVenta: credito ? g.de(['02', '10']) : '01',
    plazoCredito: credito ? g.de([15, 30, 60]) : undefined,
    mediosPago: credito ? [] : [{ tipo: g.de(['01', '02', '04']) }],
    lineas,
    otrosCargos: g.r() < 0.2 ? [{ tipoDocumento: '06', detalle: 'Impuesto de servicio 10 %', monto: g.ent(100, 50000) }] : [],
  });
}

describe('Propiedades de cálculo, validación y contabilidad (500 casos aleatorios)', () => {
  const g = azar(20261107);
  const ctx = { ...contextoSimuladorDemo(), cabysValido: () => true };
  const casos: { b: BorradorComprobante; error?: string }[] = [];
  let emitidos = 0;

  it('cada comprobante válido cuadra, es aceptado por el simulador y su asiento cuadra', () => {
    const fallas: string[] = [];
    for (let i = 0; i < 500; i++) {
      const b = caso(g);
      let c;
      try {
        c = { ...construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: i + 1, ambiente: 'simulacion', codigoSeguridad: '12345678', fecha: new Date('2026-11-07T10:00:00-06:00') }), estado: 'aceptado' as const };
      } catch (e) {
        if (!(e instanceof ErrorValidacion)) { fallas.push(`#${i} excepción inesperada: ${(e as Error).message}`); continue; }
        casos.push({ b, error: e.validaciones.filter((v) => v.nivel === 'error').map((v) => v.mensaje).join(' / ') });
        continue;
      }
      emitidos++;
      const r = c.resumen;
      const sinNaN = JSON.stringify(c).match(/NaN|Infinity|undefined/);
      if (sinNaN) fallas.push(`#${i} contiene ${sinNaN[0]}`);
      // Total = Σ MontoTotalLinea + otros cargos − IVA devuelto (Anexo v4.4, resumen).
      const esperado = c.lineas.reduce((s, l) => s + l.montoTotalLinea, 0) + b.otrosCargos.reduce((s, o) => s + o.monto, 0) - r.totalIVADevuelto;
      if (Math.abs(esperado - r.totalComprobante) > 0.01) fallas.push(`#${i} total ${r.totalComprobante} ≠ ${esperado}`);
      if (Math.abs(r.totalVentaNeta + r.totalImpuesto - (r.totalComprobante - b.otrosCargos.reduce((s, o) => s + o.monto, 0) + r.totalIVADevuelto)) > 0.02) {
        fallas.push(`#${i} venta neta ${r.totalVentaNeta} + impuesto ${r.totalImpuesto} no concilia con el total ${r.totalComprobante}`);
      }
      for (const l of c.lineas) {
        if (l.montoTotal < 0 || l.subTotal < 0 || l.impuestoNeto < 0) fallas.push(`#${i} línea ${l.numeroLinea} con montos negativos`);
        if (Math.abs(l.montoTotalLinea - (l.subTotal + l.impuestoNeto)) > 0.00001) fallas.push(`#${i} línea ${l.numeroLinea}: MontoTotalLinea ≠ SubTotal + ImpuestoNeto`);
      }
      const h = validarComoHacienda(c, { ...ctx, ahora: new Date('2026-11-07T10:05:00-06:00') });
      if (h.estado !== 'aceptado') fallas.push(`#${i} el simulador rechazó un comprobante que la app dio por válido: ${h.detalle.join('; ').slice(0, 300)}`);
      const a = generarAsiento(documentoDesdeComprobante(c), { politicas: POLITICAS_PREDETERMINADAS, esInventario: () => false, kardex: new Kardex(), fraccionAcreditable: new Map(), ivaDiferido: new RegistroIvaDiferido() });
      if (!a.cuadrado || a.alertas.some((x) => x.startsWith('ASIENTO_DESCUADRADO') || x.startsWith('DESCUADRE_ARITMETICO'))) fallas.push(`#${i} asiento descuadrado: debe ${a.totalDebe} haber ${a.totalHaber} ${a.alertas.join(' ')}`);
    }
    expect(fallas.slice(0, 15)).toEqual([]);
    // La generación debe producir sobre todo comprobantes válidos; si no, el generador no prueba nada.
    expect(emitidos).toBeGreaterThan(300);
  });

  it('los rechazos locales tienen un mensaje de error explicativo', () => {
    expect(casos.every((c) => c.error && c.error.length > 10)).toBe(true);
  });
});

describe('Propiedades de un año de operaciones con crédito, cobros parciales y notas de crédito', () => {
  for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`semilla ${semilla}: estados cuadrados e IVA diferido conciliado entre libro y reporte`, () => {
      const g = azar(semilla);
      const emitidos: Comprobante[] = [];
      let numero = 0;
      const emitir = (b: BorradorComprobante, fecha: string) => {
        const c = { ...construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero: ++numero, ambiente: 'simulacion', codigoSeguridad: '12345678', fecha: new Date(`${fecha}T10:00:00-06:00`) }), estado: 'aceptado' as const };
        emitidos.push(c);
        return c;
      };
      const ventas: { c: Comprobante; precio: number; cobrado: number }[] = [];
      for (let mes = 1; mes <= 11; mes++) {
        for (let k = 0; k < g.ent(1, 4); k++) {
          const dia = String(g.ent(1, 28)).padStart(2, '0');
          const fecha = `2026-${String(mes).padStart(2, '0')}-${dia}`;
          const condicion = g.de(['01', '02', '10', '10']);
          const precio = g.ent(10, 500) * 1000;
          const fe = emitir(borrador({
            condicionVenta: condicion, plazoCredito: condicion === '01' ? undefined : g.de([30, 60, 120]),
            mediosPago: condicion === '01' ? [{ tipo: '04' }] : [],
            lineas: [linea({ precioUnitario: precio })],
          }), fecha);
          if (condicion !== '01') ventas.push({ c: fe, precio, cobrado: 0 });
        }
        // Cobros (REP) y notas de crédito sobre ventas a crédito anteriores.
        for (const v of ventas) {
          if (v.c.fechaEmision.slice(0, 7) >= `2026-${String(mes).padStart(2, '0')}` || v.cobrado >= v.precio) continue;
          const fecha = `2026-${String(mes).padStart(2, '0')}-28`;
          const ref = { tipoDoc: '01', numero: v.c.clave, fechaEmision: v.c.fechaEmision };
          const x = g.r();
          if (x < 0.3) {
            const monto = Math.min(v.precio - v.cobrado, g.de([v.precio - v.cobrado, Math.round(v.precio / 2)]));
            v.cobrado += monto;
            emitir(borrador({ tipo: 'REP', condicionVenta: v.c.borrador.condicionVenta === '10' ? '11' : '09', mediosPago: [{ tipo: '04' }], lineas: [linea({ precioUnitario: monto })], referencias: [{ ...ref, codigo: '17', razon: 'Pago' }] }), fecha);
          } else if (x < 0.4) {
            const monto = Math.round((v.precio - v.cobrado) / 4);
            if (monto <= 0) continue;
            v.cobrado += monto;
            emitir(borrador({ tipo: 'NC', condicionVenta: v.c.borrador.condicionVenta, plazoCredito: 30, mediosPago: [], lineas: [linea({ precioUnitario: monto })], referencias: [{ ...ref, codigo: '02', razon: 'Descuento' }] }), fecha);
          }
        }
      }
      const corte = '2026-12-31';
      const libro = completarLibro(
        generarLibroDiario({ emisor: EMISOR_DEMO, emitidos, recibidos: [], cabysInventario: [], fechaCorte: corte }),
        { '2026': { ajustesAutomaticos: true, cerrado: false, manuales: [], parametros: { ...parametrosPredeterminados('02'), porcentajeIncobrables: 2 } } },
      );
      expect(libro.asientos.every((a) => a.cuadrado)).toBe(true);
      const ef = estadosFinancieros(libro.asientos, '2026-01-01', corte);
      expect([ef.situacion.cuadra, ef.cambiosPatrimonio.cuadra, ef.flujos.cuadra]).toEqual([true, true, true]);
      // El saldo de «IVA por devengar» es el IVA todavía diferido, y coincide con lo que el reporte
      // del art. 40 bis dejó sin declarar en el año (−Σ ajustes mensuales).
      const saldo = libro.asientos.flatMap((a) => a.lineas).filter((l) => l.cuenta === '2.1.02.02').reduce((s, l) => s + l.haber - l.debe, 0);
      const ajustes = Array.from({ length: 12 }, (_, i) => ivaDiferidoDelPeriodo(emitidos, `2026-${String(i + 1).padStart(2, '0')}`, corte).ajuste).reduce((s, x) => s + x, 0);
      expect(saldo).toBeGreaterThanOrEqual(-0.01);
      expect(saldo).toBeCloseTo(-ajustes, 1);
      // A fin de año no puede quedar IVA diferido de ventas con más de 90 días.
      const vencidas = libro.asientos.filter((a) => a.glosa.includes('IVA diferido vencido'));
      expect(vencidas.every((a) => a.fecha <= corte)).toBe(true);
    });
  }
});
