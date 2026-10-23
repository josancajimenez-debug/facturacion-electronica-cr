import { EMISOR_DEMO, RECEPTORES_DEMO } from '../src/datos-demo';
import type { BorradorComprobante, LineaBorrador } from '../src/tipos';

export const receptor = (id: string) => {
  const r = RECEPTORES_DEMO.find((x) => x.id === id)!;
  return { nombre: r.nombre, identificacion: r.identificacion, ubicacion: r.ubicacion, correo: r.correo, otrasSenasExtranjero: r.otrasSenasExtranjero };
};

export function linea(parcial: Partial<LineaBorrador> = {}): LineaBorrador {
  return {
    codigoCabys: '8222100000000',
    detalle: 'Servicios de contabilidad',
    cantidad: 1,
    unidadMedida: 'Sp',
    precioUnitario: 100000,
    descuentos: [],
    codigoTarifaIva: '08',
    ...parcial,
  };
}

export function borrador(parcial: Partial<BorradorComprobante> = {}): BorradorComprobante {
  return {
    tipo: 'FE',
    emisorId: EMISOR_DEMO.id,
    sucursal: '001',
    terminal: '00001',
    situacion: '1',
    codigoActividadEmisor: '6920.0',
    contraparte: receptor('rec-distribuidora'),
    condicionVenta: '01',
    moneda: 'CRC',
    tipoCambio: 1,
    lineas: [linea()],
    otrosCargos: [],
    mediosPago: [{ tipo: '01' }],
    referencias: [],
    ...parcial,
  };
}
