import type { BorradorComprobante, Comprobante, ComprobanteRecibido, Emisor, Producto, Receptor, Validacion } from '@fe-cr/core';

export interface Usuario {
  uid: string;
  email: string;
}

export interface Recibido extends ComprobanteRecibido {
  estado: 'pendiente' | 'aceptado' | 'aceptado-parcial' | 'rechazado';
  limiteConfirmacion: string;
  recibidoEn: string;
  confirmacion?: {
    consecutivo: string;
    xml: string;
    tipo: string;
    fecha: string;
    respuestaHacienda: string;
    advertencias?: string[];
  };
}

export interface EntradaBitacora {
  id: string;
  fecha: string;
  accion: string;
  clave?: string;
  consecutivo?: string;
  documento?: string;
  detalle?: string;
  usuario?: string | null;
  ambiente?: string;
}

export interface DatosConfirmacion {
  clave: string;
  mensaje: '1' | '2' | '3';
  detalleMensaje?: string;
  condicionImpuesto?: string;
  codigoActividad?: string;
  montoTotalImpuestoAcreditar?: number;
  montoTotalDeGastoAplicable?: number;
  /** Feriados configurados por el usuario, para calcular el plazo en días hábiles. */
  feriados?: string[];
}

export interface TipoCambio {
  venta: number;
  compra: number;
  fecha: string;
  fuente: string;
}

/** Filas de bitácora que trae el backend Supabase (las más recientes). */
export const LIMITE_BITACORA = 500;

/** Tipo de cambio de referencia desde el API público de Hacienda (permite CORS). */
export async function consultarTipoCambio(): Promise<TipoCambio> {
  const resp = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
  if (!resp.ok) throw new Error(`El API de Hacienda respondió ${resp.status}.`);
  const j = (await resp.json()) as { venta: { fecha: string; valor: number }; compra: { valor: number } };
  return { venta: j.venta.valor, compra: j.compra.valor, fecha: j.venta.fecha, fuente: 'api.hacienda.go.cr/indicadores/tc/dolar' };
}

/** Error con el detalle de validaciones devuelto al emitir o confirmar. */
export class ErrorConValidaciones extends Error {
  constructor(message: string, public validaciones: Validacion[]) {
    super(message);
  }
}

type Desuscribir = () => void;

/**
 * Contrato común para los dos modos de persistencia:
 * - LocalBackend: navegador (localStorage), lógica del core ejecutada en el cliente.
 * - SupabaseBackend: Auth + PostgreSQL con RLS (tiempo real) + función Edge para operaciones seguras.
 */
export interface Backend {
  modo: 'local' | 'supabase';
  descripcion: string;
  onAuth(cb: (u: Usuario | null) => void): Desuscribir;
  ingresar(email: string, clave: string): Promise<void>;
  registrar(email: string, clave: string): Promise<void>;
  salir(): Promise<void>;

  onEmisores(cb: (e: Emisor[]) => void): Desuscribir;
  guardarEmisor(e: Emisor): Promise<string>;
  sembrarDemo(): Promise<string>;

  onReceptores(emisorId: string, cb: (r: Receptor[]) => void): Desuscribir;
  guardarReceptor(emisorId: string, r: Receptor): Promise<void>;
  eliminarReceptor(emisorId: string, id: string): Promise<void>;

  onProductos(emisorId: string, cb: (p: Producto[]) => void): Desuscribir;
  guardarProducto(emisorId: string, p: Producto): Promise<void>;
  eliminarProducto(emisorId: string, id: string): Promise<void>;

  onComprobantes(emisorId: string, cb: (c: Comprobante[]) => void): Desuscribir;
  emitir(emisorId: string, borrador: BorradorComprobante, escenarioPrueba?: string): Promise<{ clave: string }>;

  onRecibidos(emisorId: string, cb: (r: Recibido[]) => void): Desuscribir;
  simularRecepcion(emisorId: string): Promise<{ clave: string }>;
  registrarRecibidoXml(emisorId: string, xml: string): Promise<{ clave: string }>;
  confirmar(emisorId: string, datos: DatosConfirmacion): Promise<{ consecutivo: string }>;

  onBitacora(emisorId: string, cb: (b: EntradaBitacora[]) => void): Desuscribir;
  tipoCambio(): Promise<TipoCambio>;
}
