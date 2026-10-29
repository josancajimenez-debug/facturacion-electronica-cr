import { RECEPTORES_DEMO, actualizacionVigente, fechaEmisionCR, type BorradorComprobante, type Comprobante, type Emisor, type LineaBorrador, type Validacion } from '@fe-cr/core';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorConValidaciones } from '../backend/tipos';
import { Alerta, ListaValidaciones } from '../components/ui';
import { useApp } from '../estado';
import { ETIQUETA_ESTADO } from '../lib/formato';
import { contraparteDesde } from './NuevoComprobante';

/**
 * Última factura aceptada que aún no fue anulada (códigos 01 o 13). Si se repitiera la anulación de la
 * misma factura, la segunda NC superaría el saldo acreditable y, desde el 1/11/2026, se rechazaría.
 */
function facturaSinAnular(comprobantes: Comprobante[]): Comprobante | undefined {
  const anuladas = new Set(
    comprobantes
      .filter((c) => c.tipo === 'NC' && c.estado !== 'rechazado' && c.estado !== 'error')
      .flatMap((c) => c.borrador.referencias.filter((r) => r.codigo === '01' || r.codigo === '13').map((r) => r.numero)),
  );
  return comprobantes.find((c) => c.tipo === 'FE' && c.estado === 'aceptado' && !anuladas.has(c.clave));
}
const SIN_FACTURA = 'Primero ejecute un escenario de factura aceptada (o todas las facturas aceptadas ya están anuladas).';

const rec = (id: string) => contraparteDesde(RECEPTORES_DEMO.find((r) => r.id === id)!);
const L = (p: Partial<LineaBorrador> = {}): LineaBorrador => ({ codigoCabys: '8222100000000', detalle: 'Servicios de contabilidad mensual', cantidad: 1, unidadMedida: 'Sp', precioUnitario: 150000, descuentos: [], codigoTarifaIva: '08', ...p });

interface Escenario {
  id: string;
  titulo: string;
  descripcion: string;
  esperado: 'aceptado' | 'rechazado' | 'error de validación';
  fuente: string;
  forzar?: string;
  armar: (base: BorradorComprobante, ctx: { comprobantes: Comprobante[]; emisor: Emisor }) => BorradorComprobante | string;
}

const ESCENARIOS: Escenario[] = [
  { id: 'fe-contado', titulo: 'Factura de contado al 13 %', descripcion: 'Servicio gravado con tarifa general, pago en efectivo.', esperado: 'aceptado', fuente: 'Nota 8.1 código 08',
    armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), codigoActividadReceptor: '4719.9', lineas: [L()] }) },
  { id: 'te-sinpe', titulo: 'Tiquete con SINPE Móvil y efectivo', descripcion: 'Consumidor final; dos medios de pago que suman el total.', esperado: 'aceptado', fuente: 'Nota 6 código 06; Decreto 45953-H',
    armar: (b) => ({ ...b, tipo: 'TE', lineas: [L({ codigoCabys: '2391102010200', detalle: 'Café tostado molido 1 kg', unidadMedida: 'Kg', precioUnitario: 6500, codigoTarifaIva: '02', cantidad: 2 })], mediosPago: [{ tipo: '06', monto: 10000 }, { tipo: '01', monto: 3130 }] }) },
  { id: 'fe-exonerada', titulo: 'Factura exonerada (autorización AL)', descripcion: 'Receptor con exoneración del 13 % (autorización ficticia AL-00000001-25).', esperado: 'aceptado', fuente: 'Nota 10.1 código 04',
    armar: (b) => ({ ...b, contraparte: rec('rec-exonerada'), lineas: [L({ codigoCabys: '4523000990000', detalle: 'Computadora de escritorio', unidadMedida: 'Unid', precioUnitario: 420000, exoneracion: RECEPTORES_DEMO[2].exoneracion })] }) },
  { id: 'fe-credito', titulo: 'Factura a crédito 30 días', descripcion: 'Condición 02 con plazo; el medio de pago no es obligatorio.', esperado: 'aceptado', fuente: 'Nota 5; campo PlazoCredito',
    armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), condicionVenta: '02', plazoCredito: 30, mediosPago: [], lineas: [L(), L({ codigoCabys: '3221000000000', detalle: 'Libro de texto escolar impreso', unidadMedida: 'Unid', precioUnitario: 12000, codigoTarifaIva: '10', cantidad: 3 })] }) },
  { id: 'fe-iva90', titulo: 'Venta a crédito con IVA hasta 90 días', descripcion: 'Condición 10 (art. 27 LIVA). Luego puede registrar el pago con un REP desde el detalle.', esperado: 'aceptado', fuente: 'Nota 5 código 10; art. 27 LIVA',
    armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), condicionVenta: '10', plazoCredito: 60, mediosPago: [], lineas: [L()] }) },
  { id: 'fee', titulo: 'Factura de exportación de servicios', descripcion: 'Cliente extranjero no domiciliado (tipo 05). Sin exoneraciones ni base imponible.', esperado: 'aceptado', fuente: 'Notas 4 y 2; condiciones FEE',
    armar: (b) => ({ ...b, tipo: 'FEE', contraparte: rec('rec-extranjero'), mediosPago: [{ tipo: '04' }], lineas: [L({ codigoCabys: '8314300000000', detalle: 'Desarrollo de software a la medida (hora)', unidadMedida: 'h', precioUnitario: 25000, cantidad: 10 })] }) },
  { id: 'fec', titulo: 'Factura electrónica de compra', descripcion: 'Compra a un vendedor no obligado (régimen especial). El vendedor va en el nodo Emisor.', esperado: 'aceptado', fuente: 'Decreto 44739-H art. 2 inc. 13; Nota 10 código 14',
    armar: (b, { emisor }) => ({ ...b, tipo: 'FEC', regimenVendedor: 'agropecuario', codigoActividadEmisor: undefined, codigoActividadReceptor: emisor.actividades[0].codigo,
      contraparte: { nombre: 'Productor Ficticio Agropecuario', identificacion: { tipo: '01', numero: '199990002' }, ubicacion: { provincia: '5', canton: '01', distrito: '01', otrasSenas: 'Finca de pruebas' } },
      lineas: [L({ codigoCabys: '0231200000000', detalle: 'Huevos de gallina frescos (cajilla)', unidadMedida: 'Unid', precioUnitario: 3000, codigoTarifaIva: '02', cantidad: 10 })],
      referencias: [{ tipoDoc: '14', numero: 'RE-0001', fechaEmision: fechaEmisionCR(), codigo: '04', razon: 'Compra a contribuyente de régimen especial agropecuario' }] }) },
  { id: 'sin-internet', titulo: 'Comprobante «sin internet»', descripcion: 'Situación 3: se genera y firma en el acto y se envía dentro de los 2 días hábiles siguientes.', esperado: 'aceptado', fuente: 'Nota 3; Decreto 44739-H art. 21',
    armar: (b) => ({ ...b, situacion: '3', contraparte: rec('rec-persona'), lineas: [L({ codigoCabys: '9291900000300', detalle: 'Capacitación en computación', precioUnitario: 45000, codigoTarifaIva: '03' })] }) },
  { id: 'nc', titulo: 'Nota de crédito que anula la última factura aceptada sin anular', descripcion: 'Referencia tipo 01 con código 01 «Anula documento de referencia».', esperado: 'aceptado', fuente: 'RES-0027 art. 9; Nota 9',
    armar: (_base, { comprobantes }) => {
      const fe = facturaSinAnular(comprobantes);
      if (!fe) return SIN_FACTURA;
      return { ...fe.borrador, tipo: 'NC', situacion: '1', referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '01', razon: 'Anula documento de referencia' }] };
    } },
  { id: 'nc-error-material', titulo: 'Anulación por error material (código 13)', descripcion: 'NC que anula la última factura aceptada por error material; su efecto se imputa al período de la factura. Luego, desde el detalle, emita el sustituto con el código 15.', esperado: 'aceptado', fuente: 'Nota 9 códigos 13 y 15 (actualización v4.4); Decreto 44739-H art. 10',
    armar: (_base, { comprobantes }) => {
      const fe = facturaSinAnular(comprobantes);
      if (!fe) return SIN_FACTURA;
      return { ...fe.borrador, tipo: 'NC', situacion: '1', referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '13', razon: 'Anula documento de referencia por error material' }] };
    } },
  { id: 'nc-excede', titulo: 'Nota de crédito mayor que lo facturado', descripcion: 'NC por el doble de la última factura aceptada. Hasta el 31/10/2026 se acepta con advertencia; desde el 1/11/2026 se rechaza.', esperado: actualizacionVigente() ? 'rechazado' : 'aceptado', fuente: 'Anexos y Estructuras v4.4 actualizado (límite de la NC)',
    armar: (_base, { comprobantes }) => {
      const fe = facturaSinAnular(comprobantes);
      if (!fe) return SIN_FACTURA;
      return { ...fe.borrador, tipo: 'NC', situacion: '1', lineas: fe.borrador.lineas.map((l) => ({ ...l, cantidad: l.cantidad * 2 })), mediosPago: fe.borrador.mediosPago.map((m) => ({ tipo: m.tipo })).slice(0, 1),
        referencias: [{ tipoDoc: '01', numero: fe.clave, fechaEmision: fe.fechaEmision, codigo: '02', razon: 'Corrige monto' }] };
    } },
  { id: 'rech-receptor', titulo: 'Rechazo: receptor no inscrito', descripcion: 'La cédula del receptor no existe en el padrón simulado (validación de nivel 3).', esperado: 'rechazado', fuente: 'Anexo 1 p. 23; validación nivel 3',
    armar: (b) => ({ ...b, contraparte: { nombre: 'Cliente Inexistente', identificacion: { tipo: '01', numero: '199999999' } }, lineas: [L()] }) },
  { id: 'rech-cabys', titulo: 'Rechazo: código CAByS inexistente', descripcion: 'Código de 13 dígitos que no está en el catálogo vigente.', esperado: 'rechazado', fuente: 'Validaciones generales p. 17; nota 17',
    armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), lineas: [L({ codigoCabys: '9999999999999', detalle: 'Servicio con código inválido' })] }) },
  { id: 'rech-forzado', titulo: 'Rechazo forzado del validador', descripcion: 'Practique la sustitución de un comprobante rechazado (sin nota de crédito).', esperado: 'rechazado', fuente: 'Decreto 44739-H art. 19',
    forzar: 'Rechazo forzado para práctica (escenario de prueba).', armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), lineas: [L()] }) },
  { id: 'err-pagos', titulo: 'Error local: medios de pago no cuadran', descripcion: 'La suma de los medios de pago no coincide con el total; no se consume consecutivo.', esperado: 'error de validación', fuente: 'Campo TotalComprobante (p. 55)',
    armar: (b) => ({ ...b, contraparte: rec('rec-distribuidora'), lineas: [L()], mediosPago: [{ tipo: '01', monto: 1000 }, { tipo: '02', monto: 1000 }] }) },
];

export function Escenarios() {
  const { emisor, comprobantes, backend } = useApp();
  const [resultados, setResultados] = useState<Record<string, { clave?: string; validaciones?: Validacion[]; mensaje?: string }>>({});
  const [corriendo, setCorriendo] = useState<string | null>(null);

  const faltante = emisor!.actividades.length === 0 ? 'Registre al menos una actividad económica en el emisor.' : emisor!.sucursales.length === 0 ? 'Registre al menos una sucursal con terminal en el emisor.' : null;

  const base = (): BorradorComprobante => ({
    tipo: 'FE', emisorId: emisor!.id, sucursal: emisor!.sucursales[0]?.codigo ?? '001', terminal: emisor!.sucursales[0]?.terminales[0] ?? '00001', situacion: '1',
    codigoActividadEmisor: emisor!.actividades.find((a) => a.principal)?.codigo ?? emisor!.actividades[0]?.codigo,
    condicionVenta: '01', moneda: 'CRC', tipoCambio: 1, lineas: [], otrosCargos: [], mediosPago: [{ tipo: '01' }], referencias: [],
  });

  const ejecutar = async (e: Escenario) => {
    setCorriendo(e.id);
    try {
      const b = e.armar(base(), { comprobantes, emisor: emisor! });
      if (typeof b === 'string') {
        setResultados((r) => ({ ...r, [e.id]: { mensaje: b } }));
        return;
      }
      const { clave } = await backend.emitir(emisor!.id, b, e.forzar);
      setResultados((r) => ({ ...r, [e.id]: { clave } }));
    } catch (err) {
      setResultados((r) => ({ ...r, [e.id]: err instanceof ErrorConValidaciones ? { validaciones: err.validaciones } : { mensaje: (err as Error).message } }));
    } finally {
      setCorriendo(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Escenarios de prueba</h1>
          <p>Casos predefinidos con datos ficticios para verificar cálculos, validaciones y respuestas del simulador.</p>
        </div>
        {faltante && <Alerta tipo="warn">{faltante} <Link to="/emisor">Ir al emisor</Link></Alerta>}
      </div>
      <div className="grid grid-3">
        {ESCENARIOS.map((e) => {
          const r = resultados[e.id];
          const c = r?.clave ? comprobantes.find((x) => x.clave === r.clave) : undefined;
          return (
            <div key={e.id} className="card">
              <div className="card-body stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>{e.titulo}</h3>
                  <span className={`badge ${e.esperado === 'aceptado' ? 'ok' : e.esperado === 'rechazado' ? 'err' : 'warn'}`}>Esperado: {e.esperado}</span>
                </div>
                <p className="small muted" style={{ margin: 0 }}>{e.descripcion}</p>
                <p className="small" style={{ margin: 0 }}>Fuente: {e.fuente}</p>
                <button className="btn btn-sm" disabled={corriendo !== null || !!faltante} onClick={() => ejecutar(e)}><Play /> {corriendo === e.id ? 'Ejecutando…' : 'Ejecutar'}</button>
                {r?.clave && (
                  <Alerta tipo={c?.estado === 'aceptado' ? 'ok' : c?.estado === 'rechazado' ? 'err' : 'info'}>
                    Resultado: <strong>{c ? ETIQUETA_ESTADO[c.estado]?.texto.toLowerCase() ?? c.estado : 'enviando…'}</strong> · <Link to={`/comprobantes/${r.clave}`}>ver comprobante</Link>
                  </Alerta>
                )}
                {r?.validaciones && <ListaValidaciones validaciones={r.validaciones.filter((v) => v.nivel === 'error')} />}
                {r?.mensaje && <Alerta tipo="warn">{r.mensaje}</Alerta>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
