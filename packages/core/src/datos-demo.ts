/**
 * Datos FICTICIOS para pruebas y demostración. Los nombres e identificaciones son inventados;
 * cualquier coincidencia con un contribuyente real es accidental. Los códigos CAByS provienen
 * del catálogo CAByS 2025 (BCCR) y los de actividad económica de la correspondencia
 * ATV (CIIU 3) – TRIBU-CR (CIIU 4) publicada por la DGT.
 */
import type { ContextoSimulador } from './simulador';
import type { Emisor, Producto, Receptor } from './tipos';

export const EMISOR_DEMO: Emisor = {
  id: 'emisor-demo',
  nombre: 'Servicios Contables Demo Ficticia S.A.',
  nombreComercial: 'Contadores Demo',
  identificacion: { tipo: '02', numero: '3109999001' },
  ubicacion: { provincia: '1', canton: '01', distrito: '01', barrio: 'Barrio Ficticio', otrasSenas: 'Edificio de pruebas, piso 2, oficina 201' },
  telefono: { codigoPais: '506', numero: '22220000' },
  correos: ['facturacion@demo-ficticia.test'],
  actividades: [
    { codigo: '6920.0', descripcion: 'Actividades de contabilidad, teneduría de libros y auditorías; consultoría fiscal', principal: true },
    { codigo: '6201.0', descripcion: 'Actividades de programación informática' },
  ],
  sucursales: [
    { codigo: '001', nombre: 'Casa matriz', terminales: ['00001', '00002'] },
    { codigo: '002', nombre: 'Sucursal Heredia', terminales: ['00001'] },
  ],
  proveedorSistemas: '3109999001',
  telefonosSinpe: ['88880000'],
  condicion: 'emisor-receptor',
};

export const RECEPTORES_DEMO: Receptor[] = [
  {
    id: 'rec-distribuidora',
    nombre: 'Distribuidora Ficticia del Valle S.A.',
    identificacion: { tipo: '02', numero: '3109999002' },
    ubicacion: { provincia: '4', canton: '01', distrito: '01', otrasSenas: 'Bodega de pruebas número 3' },
    correo: 'compras@distribuidora-ficticia.test',
    actividadEconomica: '4719.9',
  },
  {
    id: 'rec-persona',
    nombre: 'Persona Ficticia Uno',
    identificacion: { tipo: '01', numero: '199990001' },
    correo: 'persona.uno@correo-ficticio.test',
  },
  {
    id: 'rec-exonerada',
    nombre: 'Institución Exonerada Ficticia',
    identificacion: { tipo: '02', numero: '3009999003' },
    ubicacion: { provincia: '2', canton: '01', distrito: '01', otrasSenas: 'Frente al parque de pruebas' },
    correo: 'proveeduria@exonerada-ficticia.test',
    exoneracion: {
      tipoDocumento: '04',
      numeroDocumento: 'AL-00000001-25',
      institucion: '01',
      fechaEmision: '2025-10-01T08:00:00-06:00',
      tarifaExonerada: 13,
    },
  },
  {
    id: 'rec-extranjero',
    nombre: 'Foreign Demo Client LLC',
    identificacion: { tipo: '05', numero: 'US0000DEMO01' },
    otrasSenasExtranjero: '100 Demo Street, Example City, United States',
    correo: 'billing@foreign-demo.test',
  },
];

export const PRODUCTOS_DEMO: Producto[] = [
  { id: 'p-contab', codigoCabys: '8222100000000', descripcion: 'Servicios de contabilidad mensual', unidadMedida: 'Sp', precioUnitario: 150000, moneda: 'CRC', codigoTarifaIva: '08', activo: true },
  { id: 'p-software', codigoCabys: '8314300000000', descripcion: 'Desarrollo de software a la medida (hora)', unidadMedida: 'h', precioUnitario: 25000, moneda: 'CRC', codigoTarifaIva: '08', activo: true },
  { id: 'p-capacit', codigoCabys: '9291900000300', descripcion: 'Capacitación en computación', unidadMedida: 'Sp', precioUnitario: 45000, moneda: 'CRC', codigoTarifaIva: '03', activo: true },
  { id: 'p-libro', codigoCabys: '3221000000000', descripcion: 'Libro de texto escolar impreso', unidadMedida: 'Unid', precioUnitario: 12000, moneda: 'CRC', codigoTarifaIva: '10', activo: true },
  { id: 'p-cafe', codigoCabys: '2391102010200', descripcion: 'Café tostado molido 1 kg', unidadMedida: 'Kg', precioUnitario: 6500, moneda: 'CRC', codigoTarifaIva: '02', activo: true },
  { id: 'p-consulta', codigoCabys: '9310100000100', descripcion: 'Consulta de médico general', unidadMedida: 'Sp', precioUnitario: 30000, moneda: 'CRC', codigoTarifaIva: '04', servicioSalud: true, activo: true },
  { id: 'p-compu', codigoCabys: '4523000990000', descripcion: 'Computadora de escritorio', unidadMedida: 'Unid', precioUnitario: 420000, moneda: 'CRC', codigoTarifaIva: '08', activo: true },
  { id: 'p-agua', codigoCabys: '2441002020000', descripcion: 'Agua natural embotellada 600 ml', unidadMedida: 'Unid', precioUnitario: 650, moneda: 'CRC', codigoTarifaIva: '08', activo: true },
];

/** Proveedor ficticio que "envía" comprobantes al emisor demo (módulo de recepción). */
export const PROVEEDOR_DEMO: Emisor = {
  id: 'proveedor-demo',
  nombre: 'Proveedor Ficticio de Insumos S.A.',
  identificacion: { tipo: '02', numero: '3109999004' },
  ubicacion: { provincia: '3', canton: '01', distrito: '01', otrasSenas: 'Zona industrial de pruebas' },
  correos: ['ventas@proveedor-ficticio.test'],
  actividades: [{ codigo: '4719.9', descripcion: 'Venta al por menor en bazares y otros establecimientos no especializados n.c.p', principal: true }],
  sucursales: [{ codigo: '001', nombre: 'Casa matriz', terminales: ['00001'] }],
  proveedorSistemas: '3109999004',
  telefonosSinpe: [],
  condicion: 'emisor-receptor',
};

/** Padrón y autorizaciones simuladas para el nivel 3 del simulador. */
export function contextoSimuladorDemo(extra: Emisor[] = []): Omit<ContextoSimulador, 'cabysValido'> {
  const padron: NonNullable<ContextoSimulador['padron']> = {};
  for (const e of [EMISOR_DEMO, PROVEEDOR_DEMO, ...extra]) {
    padron[e.identificacion.numero] = { nombre: e.nombre, estado: 'Inscrito', actividades: e.actividades.map((a) => a.codigo) };
  }
  for (const r of RECEPTORES_DEMO) {
    if (r.identificacion && r.identificacion.tipo !== '05') {
      padron[r.identificacion.numero] = { nombre: r.nombre, estado: 'Inscrito', actividades: r.actividadEconomica ? [r.actividadEconomica] : [] };
    }
  }
  return {
    padron,
    exoneraciones: { 'AL-00000001-25': { tarifaMaxima: 13, vigente: true } },
  };
}
