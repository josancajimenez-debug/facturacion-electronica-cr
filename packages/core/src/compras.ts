/**
 * Proveedores a los que el comprador les documenta la compra con una Factura Electrónica de Compra
 * (FEC). Decreto 44739-H, art. 2 inc. 13: la emite el adquirente cuando quien vende no está obligado
 * a emitir comprobantes (Régimen de Tributación Simplificada y demás exceptuados del art. 7), está en
 * el Régimen Especial Agropecuario, es un proveedor no domiciliado o es una persona física no inscrita.
 * No procede con contribuyentes del régimen simplificado inscritos como emisores receptores
 * electrónicos no confirmantes (art. 7 inc. 1: esos sí emiten su comprobante), con el transporte
 * público ni con pagos al Estado por sus actividades habituales.
 */
import { fechaEmisionCR } from './fechas';
import type { BorradorComprobante, Referencia, RegimenVendedor } from './tipos';

export type { RegimenVendedor };

export interface InfoRegimenVendedor {
  codigo: RegimenVendedor;
  descripcion: string;
  /** Si la compra se documenta con FEC. */
  procedeFec: boolean;
  fundamento: string;
  /** Tipo de documento de referencia (nota 10) que exige la FEC. */
  referencia?: '14' | '16';
  /** Tipos de identificación del vendedor admitidos (nota 4). */
  identificaciones: string[];
  ayuda: string;
}

const ART_2 = 'Decreto 44739-H, art. 2 inc. 13';

export const REGIMEN_VENDEDOR: InfoRegimenVendedor[] = [
  {
    codigo: 'simplificado',
    descripcion: 'Régimen de Tributación Simplificada (RTS)',
    procedeFec: true,
    fundamento: `${ART_2}; art. 7 inc. 1`,
    referencia: '14',
    identificaciones: ['01', '02', '03', '04'],
    ayuda: 'No está obligado a emitir comprobantes electrónicos: usted emite la FEC y referencia el comprobante que le entregó (tipo 14).',
  },
  {
    codigo: 'agropecuario',
    descripcion: 'Régimen Especial Agropecuario (REA)',
    procedeFec: true,
    fundamento: `${ART_2}; art. 7 inc. 2; Decreto 41943-H-MAG`,
    referencia: '14',
    identificaciones: ['01', '02', '03', '04'],
    ayuda: 'Productor inscrito en el régimen especial agropecuario que solo realiza actividades agropecuarias. Verifique su registro activo en el MAG.',
  },
  {
    codigo: 'no-inscrito',
    descripcion: 'Persona física no inscrita como obligado tributario',
    procedeFec: true,
    fundamento: ART_2,
    identificaciones: ['01', '03', '06'],
    ayuda: 'Con cédula, o como «No contribuyente» (tipo 06) solo en la venta de bienes usados (condición de venta 13).',
  },
  {
    codigo: 'no-domiciliado',
    descripcion: 'Proveedor no domiciliado',
    procedeFec: true,
    fundamento: `${ART_2}; Anexos y Estructuras v4.4, nota 10 (código 16)`,
    referencia: '16',
    identificaciones: ['05'],
    ayuda: 'Servicios o bienes intangibles del exterior: identificación tipo 05 y referencia al comprobante del proveedor no domiciliado (tipo 16).',
  },
  {
    codigo: 'otro-no-obligado',
    descripcion: 'Otro obligado exceptuado de emitir comprobantes (art. 7)',
    procedeFec: true,
    fundamento: `${ART_2}; art. 7 incs. 3-8`,
    identificaciones: ['01', '02', '03', '04'],
    ayuda: 'Regímenes de estimación objetiva, instituciones religiosas, condominios y demás casos del art. 7 del Reglamento.',
  },
  {
    codigo: 'no-confirmante',
    descripcion: 'RTS inscrito como emisor receptor electrónico no confirmante',
    procedeFec: false,
    fundamento: `${ART_2}; art. 7 inc. 1; art. 4 inc. 2`,
    identificaciones: ['01', '02', '03', '04'],
    ayuda: 'Al inscribirse como no confirmante quedó obligado a emitir: debe entregarle su factura electrónica; regístrela en «Recepción».',
  },
  {
    codigo: 'general',
    descripcion: 'Régimen general (obligado a emitir)',
    procedeFec: false,
    fundamento: `${ART_2}; art. 4`,
    identificaciones: ['01', '02', '03', '04'],
    ayuda: 'El proveedor debe entregarle su factura electrónica; regístrela en «Recepción».',
  },
];

export const infoRegimen = (codigo?: string) => REGIMEN_VENDEDOR.find((r) => r.codigo === codigo);

/** Régimen que sugiere la descripción del API de Hacienda (/fe/ae, campo regimen.descripcion). */
export function regimenDesdeHacienda(descripcion?: string): RegimenVendedor | undefined {
  const d = (descripcion ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (d.includes('simplificad')) return 'simplificado';
  if (d.includes('agropecuari')) return 'agropecuario';
  if (d.includes('general') || d.includes('tradicional')) return 'general';
  return undefined;
}

/** Prefijo de la razón de las referencias que agrega la APP; identifica las que puede quitar sola. */
const RAZON_AUTOMATICA = 'Compra a proveedor: ';

/**
 * Datos que el comprador deja listos al pasar del proveedor a la FEC: la referencia que exige su
 * régimen (el número del comprobante del vendedor lo completa el usuario) y la condición de venta 13
 * para el «No contribuyente».
 */
export function borradorFecPara(regimen: RegimenVendedor, tipoIdentificacion?: string, fecha = fechaEmisionCR()): Partial<BorradorComprobante> {
  const info = infoRegimen(regimen);
  const referencias: Referencia[] = info?.referencia
    ? [{ tipoDoc: info.referencia, numero: '', fechaEmision: fecha, codigo: '04', razon: `${RAZON_AUTOMATICA}${info.descripcion}` }]
    : [];
  return {
    tipo: 'FEC',
    regimenVendedor: regimen,
    referencias,
    ...(tipoIdentificacion === '06' ? { condicionVenta: '13' } : {}),
  };
}

/**
 * Ajusta la FEC al cambiar de vendedor o de régimen: quita las referencias que la APP agregó para el
 * régimen anterior y siguen sin número, agrega la que exige el nuevo y pone o quita la condición de
 * venta 13 (bienes usados de un «No contribuyente»). Las referencias que el usuario completó se conservan.
 */
export function ajustarFecAlRegimen(
  b: Pick<BorradorComprobante, 'referencias' | 'condicionVenta'>,
  regimen: RegimenVendedor | undefined,
  tipoIdentificacion?: string,
): Pick<BorradorComprobante, 'regimenVendedor' | 'referencias' | 'condicionVenta'> {
  const propias = b.referencias.filter((r) => r.numero || !r.razon?.startsWith(RAZON_AUTOMATICA));
  const sugerido = regimen ? borradorFecPara(regimen, tipoIdentificacion) : { referencias: [] };
  const faltantes = (sugerido.referencias ?? []).filter((r) => !propias.some((p) => p.tipoDoc === r.tipoDoc));
  const condicionVenta = tipoIdentificacion === '06' ? '13' : b.condicionVenta === '13' ? '01' : b.condicionVenta;
  return { regimenVendedor: regimen, referencias: [...propias, ...faltantes], condicionVenta };
}

type Reportar = (campo: string, mensaje: string) => void;

/** Reglas de la FEC según el régimen del vendedor; se llama desde validarBorrador. */
export function validarRegimenVendedor(b: BorradorComprobante, err: Reportar, adv: Reportar): void {
  if (b.tipo !== 'FEC') return;
  const info = infoRegimen(b.regimenVendedor);
  if (!info) {
    adv('regimenVendedor', 'Indique el régimen del vendedor para comprobar que la compra se documenta con FEC (Decreto 44739-H, art. 2 inc. 13).');
    return;
  }
  if (!info.procedeFec) {
    err('regimenVendedor', `No procede la FEC: ${info.descripcion.toLowerCase()}. ${info.ayuda}`);
    return;
  }
  const tipoId = b.contraparte?.identificacion?.tipo;
  if (tipoId && !info.identificaciones.includes(tipoId)) {
    err('contraparte.identificacion', `Para un vendedor en «${info.descripcion}» la identificación debe ser de tipo ${info.identificaciones.join(', ')}.`);
  }
  if (info.referencia && !b.referencias.some((r) => r.tipoDoc === info.referencia)) {
    err('referencias', `La compra a un proveedor en «${info.descripcion}» debe referenciar el tipo de documento ${info.referencia} (nota 10).`);
  }
}
