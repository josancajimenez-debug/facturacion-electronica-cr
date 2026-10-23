import { describe, expect, it } from 'vitest';
import { EMISOR_DEMO, PROVEEDOR_DEMO, contextoSimuladorDemo } from '../src/datos-demo';
import { ErrorValidacion, construirComprobante } from '../src/emision';
import { motivosBloqueoEnvioReal } from '../src/entorno';
import { extraerDatosComprobante, generarConfirmacion } from '../src/recepcion';
import { deBase64, respuestaApiSimulada, validarComoHacienda } from '../src/simulador';
import { REGEX_CORREO, validarBorrador, validarIdentificacion } from '../src/validaciones';
import { escaparXml } from '../src/xml';
import { borrador, linea, receptor } from './helpers';

const errores = (b: ReturnType<typeof borrador>) => validarBorrador(b, EMISOR_DEMO).filter((v) => v.nivel === 'error').map((v) => v.mensaje);
const emitir = (b = borrador(), numero = 1, fecha = new Date()) =>
  construirComprobante({ borrador: b, emisor: EMISOR_DEMO, numero, fecha, ambiente: 'simulacion', codigoSeguridad: '87654321' });

describe('Validaciones de negocio', () => {
  it('un borrador correcto no tiene errores', () => {
    expect(errores(borrador())).toEqual([]);
  });

  it('formatos de identificación (nota 4)', () => {
    expect(validarIdentificacion({ tipo: '01', numero: '199990001' })).toBeNull();
    expect(validarIdentificacion({ tipo: '01', numero: '099990001' })).not.toBeNull();
    expect(validarIdentificacion({ tipo: '02', numero: '310999900' })).not.toBeNull();
    expect(validarIdentificacion({ tipo: '03', numero: '155000000000' })).toBeNull();
    expect(validarIdentificacion({ tipo: '05', numero: 'US0000DEMO01' })).toBeNull();
  });

  it('expresión regular de correo del Anexo', () => {
    expect(REGEX_CORREO.test('facturacion@demo-ficticia.test')).toBe(true);
    expect(REGEX_CORREO.test('sin-arroba.test')).toBe(false);
  });

  it('condición de venta 12 solo en FE y 09/11 solo en REP', () => {
    expect(errores(borrador({ tipo: 'TE', condicionVenta: '12' }))).toContain('El código 12 solo se permite en Factura Electrónica.');
    expect(errores(borrador({ condicionVenta: '11' })).join()).toMatch(/exclusivos/);
  });

  it('crédito exige plazo y libera el medio de pago', () => {
    const e = errores(borrador({ condicionVenta: '02', mediosPago: [] }));
    expect(e.join()).toMatch(/plazo de crédito/);
    expect(e.join()).not.toMatch(/al menos un medio de pago/);
  });

  it('extranjero no domiciliado en FE requiere condición 12', () => {
    expect(errores(borrador({ contraparte: receptor('rec-extranjero') })).join()).toMatch(/condición de venta 12/);
    expect(errores(borrador({ tipo: 'FEE', contraparte: receptor('rec-extranjero') }))).toEqual([]);
  });

  it('notas de crédito requieren referencia', () => {
    expect(errores(borrador({ tipo: 'NC' })).join()).toMatch(/información de referencia/);
  });

  it('tarifas transitorias solo en NC/ND', () => {
    expect(errores(borrador({ lineas: [linea({ codigoTarifaIva: '07' })] })).join()).toMatch(/solo se usa en notas/);
  });

  it('la FEE no admite exoneraciones y exige partida arancelaria en mercancías', () => {
    const e = errores(
      borrador({
        tipo: 'FEE',
        contraparte: receptor('rec-extranjero'),
        lineas: [linea({ codigoCabys: '4523000990000', unidadMedida: 'Unid', exoneracion: { tipoDocumento: '03', numeroDocumento: 'X-123', articulo: 1, institucion: '01', fechaEmision: '2025-01-01T00:00:00-06:00', tarifaExonerada: 13 } })],
      }),
    ).join();
    expect(e).toMatch(/no admite exoneraciones/);
    expect(e).toMatch(/partida arancelaria/);
  });

  it('varios medios de pago deben sumar el total', () => {
    const b = borrador({ mediosPago: [{ tipo: '01', monto: 13000 }, { tipo: '06', monto: 90000 }] });
    const c = () => emitir(b);
    expect(c).toThrow(ErrorValidacion);
  });

  it('advierte SINPE Móvil sin teléfonos registrados (Decreto 45953-H)', () => {
    const emisorSinSinpe = { ...EMISOR_DEMO, telefonosSinpe: [] };
    const v = validarBorrador(borrador({ mediosPago: [{ tipo: '06' }] }), emisorSinSinpe);
    expect(v.find((x) => x.nivel === 'advertencia' && /SINPE/.test(x.mensaje))).toBeTruthy();
  });
});

describe('Generación de XML v4.4', () => {
  it('respeta el orden del encabezado y ubica MedioPago dentro de ResumenFactura', () => {
    const { xml } = emitir();
    expect(xml).toContain('<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"');
    const orden = ['<Clave>', '<ProveedorSistemas>', '<CodigoActividadEmisor>', '<NumeroConsecutivo>', '<FechaEmision>', '<Emisor>', '<Receptor>', '<CondicionVenta>', '<DetalleServicio>', '<ResumenFactura>'];
    const pos = orden.map((t) => xml.indexOf(t));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    const resumen = xml.slice(xml.indexOf('<ResumenFactura>'), xml.indexOf('</ResumenFactura>'));
    expect(resumen).toContain('<TipoMedioPago>01</TipoMedioPago>');
    expect(xml).toContain('<TotalComprobante>113000.00000</TotalComprobante>');
    expect(xml).toContain('ENTORNO DE SIMULACIÓN');
  });

  it('en la FEE omite los campos inexistentes (BaseImponible, ImpuestoNeto)', () => {
    const { xml } = emitir(borrador({ tipo: 'FEE', contraparte: receptor('rec-extranjero') }));
    expect(xml).toContain('<FacturaElectronicaExportacion');
    expect(xml).not.toContain('<BaseImponible>');
    expect(xml).not.toContain('<ImpuestoNeto>');
  });

  it('en la FEC el vendedor va en <Emisor> y el obligado en <Receptor>', () => {
    const vendedor = { nombre: 'Productor Ficticio Agropecuario', identificacion: { tipo: '01', numero: '199990002' }, ubicacion: { provincia: '5', canton: '01', distrito: '01', otrasSenas: 'Finca de pruebas' } };
    const b = borrador({
      tipo: 'FEC',
      codigoActividadEmisor: undefined,
      codigoActividadReceptor: '6920.0',
      contraparte: vendedor,
      referencias: [{ tipoDoc: '14', numero: 'REG-ESP-001', fechaEmision: '2025-10-01T08:00:00-06:00', codigo: '04', razon: 'Compra a contribuyente de régimen especial' }],
    });
    const { xml } = emitir(b);
    const emisorNodo = xml.slice(xml.indexOf('<Emisor>'), xml.indexOf('</Emisor>'));
    const receptorNodo = xml.slice(xml.indexOf('<Receptor>'), xml.indexOf('</Receptor>'));
    expect(emisorNodo).toContain('Productor Ficticio Agropecuario');
    expect(receptorNodo).toContain(EMISOR_DEMO.nombre);
    expect(xml).toContain('<CodigoActividadReceptor>6920.0</CodigoActividadReceptor>');
  });

  it('escapa caracteres especiales', () => {
    expect(escaparXml('A & B <c>')).toBe('A &amp; B &lt;c&gt;');
  });
});

describe('Simulador de Hacienda', () => {
  const ctx = { ...contextoSimuladorDemo(), cabysValido: (c: string) => /^\d{13}$/.test(c) && c !== '9999999999999' };

  it('acepta un comprobante correcto (mensaje 1)', () => {
    const r = validarComoHacienda(emitir(), ctx);
    expect(r.estado).toBe('aceptado');
    expect(r.mensaje).toBe('1');
    expect(r.xml).toContain('<EstadoMensaje>Aceptado</EstadoMensaje>');
  });

  it('rechaza en nivel 3 un receptor que no está en el padrón', () => {
    const b = borrador({ contraparte: { nombre: 'Cliente Inexistente', identificacion: { tipo: '01', numero: '199999999' } } });
    const r = validarComoHacienda(emitir(b), ctx);
    expect(r.estado).toBe('rechazado');
    expect(r.nivelFallido).toBe(3);
  });

  it('rechaza un CAByS inexistente', () => {
    const r = validarComoHacienda(emitir(borrador({ lineas: [linea({ codigoCabys: '9999999999999' })] })), ctx);
    expect(r.detalle.join()).toMatch(/CAByS/);
  });

  it('rechaza un comprobante alterado después de generado', () => {
    const c = emitir();
    c.resumen = { ...c.resumen, totalComprobante: 1 };
    const r = validarComoHacienda(c, ctx);
    expect(r.estado).toBe('rechazado');
  });

  it('detecta claves duplicadas', () => {
    const c = emitir();
    const r = validarComoHacienda(c, { ...ctx, clavesRecibidas: new Set([c.clave]) });
    expect(r.detalle.join()).toMatch(/duplicado/);
  });

  it('respuesta del API con el formato del Anexo 3', () => {
    const c = emitir();
    const r = validarComoHacienda(c, ctx);
    const json = respuestaApiSimulada(c.clave, 'aceptado', r.xml);
    expect(Object.keys(json)).toEqual(['clave', 'fecha', 'indEstado', 'respuestaXml']);
    expect(deBase64(json.respuestaXml!)).toBe(r.xml);
  });
});

describe('Recepción y confirmación', () => {
  const recibido = () =>
    extraerDatosComprobante(
      construirComprobante({
        borrador: borrador({ contraparte: { nombre: EMISOR_DEMO.nombre, identificacion: EMISOR_DEMO.identificacion, correo: EMISOR_DEMO.correos[0] } }),
        emisor: PROVEEDOR_DEMO,
        numero: 5,
        ambiente: 'simulacion',
      }).xml,
    );

  it('extrae los datos de un XML recibido', () => {
    const r = recibido();
    expect(r.identificacionEmisor.numero).toBe(PROVEEDOR_DEMO.identificacion.numero);
    expect(r.identificacionReceptor?.numero).toBe(EMISOR_DEMO.identificacion.numero);
    expect(r.totalComprobante).toBe(113000);
    expect(r.totalImpuesto).toBe(13000);
  });

  it('genera aceptación (05) y exige motivo en el rechazo (07)', () => {
    const base = { recibido: recibido(), receptor: EMISOR_DEMO, sucursal: '001', terminal: '00001', numero: 1 };
    const ok = generarConfirmacion({ ...base, mensaje: '1', condicionImpuesto: '01', codigoActividad: '6920.0' });
    expect(ok.consecutivo.slice(8, 10)).toBe('05');
    expect(ok.xml).toContain('<Mensaje>1</Mensaje>');
    expect(ok.validaciones.filter((v) => v.nivel === 'error')).toEqual([]);
    const rech = generarConfirmacion({ ...base, mensaje: '3' });
    expect(rech.consecutivo.slice(8, 10)).toBe('07');
    expect(rech.validaciones.map((v) => v.campo)).toContain('detalleMensaje');
  });
});

describe('Separación de entornos', () => {
  it('bloquea el envío real si falta cualquier condición', () => {
    const motivos = motivosBloqueoEnvioReal({ ambiente: 'simulacion', autorizacionExpresa: false, tieneCredencialesAtv: false, tieneLlaveCriptografica: false, firmaXadesImplementada: false });
    expect(motivos).toHaveLength(5);
    expect(motivosBloqueoEnvioReal({ ambiente: 'produccion', autorizacionExpresa: true, tieneCredencialesAtv: true, tieneLlaveCriptografica: true, firmaXadesImplementada: false })).toHaveLength(1);
  });
});
