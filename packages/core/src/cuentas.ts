/**
 * Catálogo de cuentas y manual contable para una PYME bajo la Norma de Contabilidad NIIF para las PYMES.
 * Estructura de cuatro niveles (clase.grupo.cuenta.subcuenta); solo las subcuentas reciben movimientos.
 * Las secciones se citan según la tercera edición (febrero de 2025) de la NIIF para las PYMES (ver `seccionNiif`).
 */

export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'costo' | 'gasto';
export type Naturaleza = 'deudora' | 'acreedora';

export interface Cuenta {
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  naturaleza: Naturaleza;
  /** Solo las cuentas imputables (último nivel) reciben asientos. */
  imputable: boolean;
  /** Activos y pasivos: clasificación para el estado de situación financiera. */
  corriente?: boolean;
  /** Manual: qué representa la cuenta. */
  descripcion?: string;
  seDebita?: string;
  seAcredita?: string;
  /** Sección de la NIIF para las PYMES que rige su reconocimiento y medición. */
  niif?: number;
}

type Fila = [codigo: string, nombre: string, extra?: Partial<Cuenta>];

const DEUDORAS: TipoCuenta[] = ['activo', 'costo', 'gasto'];

function tipoPorCodigo(codigo: string): TipoCuenta {
  return (['activo', 'pasivo', 'patrimonio', 'ingreso', 'costo', 'gasto'] as const)[Number(codigo[0]) - 1];
}

const FILAS: Fila[] = [
  ['1', 'ACTIVO', { descripcion: 'Recursos controlados por la entidad como resultado de sucesos pasados, de los que espera obtener beneficios económicos futuros (Sección 2).' }],
  ['1.1', 'Activo corriente', { corriente: true }],
  ['1.1.01', 'Efectivo y equivalentes de efectivo', { corriente: true, niif: 7 }],
  ['1.1.01.01', 'Caja general', {
    corriente: true, niif: 7,
    descripcion: 'Dinero en efectivo recibido o disponible en la entidad.',
    seDebita: 'Cobros de contado en efectivo (medio de pago 01).',
    seAcredita: 'Pagos en efectivo y depósitos en bancos.',
  }],
  ['1.1.01.02', 'Bancos — moneda nacional', {
    corriente: true, niif: 7,
    descripcion: 'Saldos en cuentas bancarias en colones.',
    seDebita: 'Cobros por transferencia, cheque, SINPE Móvil (06), plataforma digital (07) o recaudación por terceros (05); aportes de capital.',
    seAcredita: 'Pagos a proveedores y gastos pagados desde la cuenta bancaria.',
  }],
  ['1.1.01.03', 'Bancos — moneda extranjera', {
    corriente: true, niif: 30,
    descripcion: 'Saldos en cuentas bancarias en moneda extranjera, expresados en colones al tipo de cambio de cada transacción (Sección 30).',
    seDebita: 'Cobros en moneda extranjera.',
    seAcredita: 'Pagos en moneda extranjera.',
  }],
  ['1.1.01.04', 'Tarjetas por liquidar', {
    corriente: true, niif: 11,
    descripcion: 'Ventas cobradas con tarjeta (medio de pago 02) pendientes de que la entidad adquirente las deposite.',
    seDebita: 'Ventas cobradas con tarjeta.',
    seAcredita: 'Liquidación depositada en bancos (y comisión cargada a gastos financieros).',
  }],
  ['1.1.02', 'Cuentas por cobrar comerciales', { corriente: true, niif: 11 }],
  ['1.1.02.01', 'Clientes', {
    corriente: true, niif: 11,
    descripcion: 'Derechos de cobro por ventas a crédito; instrumento financiero medido al precio de la transacción (Sección 11).',
    seDebita: 'Ventas y notas de débito a crédito (condiciones de venta distintas de contado).',
    seAcredita: 'Cobros (incluido el Recibo Electrónico de Pago) y notas de crédito.',
  }],
  ['1.1.02.02', 'Estimación por deterioro de cuentas por cobrar', {
    corriente: true, naturaleza: 'acreedora', niif: 11,
    descripcion: 'Cuenta correctora de Clientes por el deterioro del valor de las cuentas por cobrar cuando existe evidencia objetiva de deterioro (pérdida incurrida; la tercera edición no admite pérdidas crediticias esperadas futuras).',
    seDebita: 'Castigo de cuentas incobrables o reversión del deterioro.',
    seAcredita: 'Reconocimiento del deterioro (asiento de ajuste del CPI).',
  }],
  ['1.1.03', 'Inventarios', { corriente: true, niif: 13 }],
  ['1.1.03.01', 'Inventario de mercadería', {
    corriente: true, niif: 13,
    descripcion: 'Bienes adquiridos para la venta (CAByS del catálogo de productos de la entidad). Se miden al costo, que incluye el precio neto de descuentos y el IVA no acreditable; las salidas se valoran por costo promedio ponderado (Sección 13).',
    seDebita: 'Compras de mercadería y devoluciones de clientes (nota de crédito con código 06).',
    seAcredita: 'Costo de las ventas, devoluciones y descuentos de proveedores.',
  }],
  ['1.1.04', 'Créditos fiscales', { corriente: true }],
  ['1.1.04.01', 'IVA soportado acreditable', {
    corriente: true,
    descripcion: 'IVA pagado en compras que da derecho a crédito fiscal, según la condición del impuesto declarada en el mensaje receptor (01, 02, 03 o 05).',
    seDebita: 'IVA acreditable de compras confirmadas.',
    seAcredita: 'Notas de crédito de proveedores y compensación con el IVA repercutido en la liquidación.',
  }],
  ['1.1.04.02', 'IVA soportado pendiente de pago', {
    corriente: true,
    descripcion: 'IVA acreditable de compras a crédito con pago diferido del impuesto (condición de venta 10, art. 27 de la Ley del IVA); se traslada a acreditable al pagar.',
    seDebita: 'Compras con condición de venta 10.',
    seAcredita: 'Pago documentado con Recibo Electrónico de Pago.',
  }],
  ['1.1.04.03', 'IVA devuelto por recuperar', {
    corriente: true,
    descripcion: 'IVA de servicios de salud pagados con tarjeta que el comprobante devuelve al cliente (campo TotalIVADevuelto). Su recuperación debe verificarse en la normativa vigente.',
    seDebita: 'IVA devuelto en ventas de servicios de salud.',
    seAcredita: 'Aplicación en la declaración del IVA.',
  }],
  ['1.1.05', 'Gastos pagados por anticipado', { corriente: true }],
  ['1.1.05.01', 'Seguros y otros pagos anticipados', {
    corriente: true,
    descripcion: 'Pagos por servicios que se recibirán en periodos futuros.',
    seDebita: 'Pago anticipado (reclasificación del CPI).',
    seAcredita: 'Gasto devengado en cada periodo.',
  }],
  ['1.2', 'Activo no corriente', { corriente: false }],
  ['1.2.01', 'Propiedades, planta y equipo', { corriente: false, niif: 17 }],
  ['1.2.01.01', 'Mobiliario y equipo de oficina', {
    corriente: false, niif: 17,
    descripcion: 'Muebles y equipo de oficina con costo igual o mayor al umbral de capitalización de la política contable.',
    seDebita: 'Adquisiciones (precio + IVA no acreditable + costos atribuibles).',
    seAcredita: 'Ventas, bajas o retiros.',
  }],
  ['1.2.01.02', 'Equipo de cómputo', {
    corriente: false, niif: 17,
    descripcion: 'Computadoras y equipo de procesamiento de datos (CAByS 452) sobre el umbral de capitalización.',
    seDebita: 'Adquisiciones.',
    seAcredita: 'Ventas, bajas o retiros.',
  }],
  ['1.2.01.03', 'Vehículos', {
    corriente: false, niif: 17,
    descripcion: 'Vehículos automotores (CAByS 491) sobre el umbral de capitalización.',
    seDebita: 'Adquisiciones.',
    seAcredita: 'Ventas, bajas o retiros.',
  }],
  ['1.2.01.04', 'Maquinaria y equipo', {
    corriente: false, niif: 17,
    descripcion: 'Maquinaria, equipo eléctrico, de comunicación e instrumentos (CAByS 43, 44, 46, 47 y 48) sobre el umbral de capitalización.',
    seDebita: 'Adquisiciones.',
    seAcredita: 'Ventas, bajas o retiros.',
  }],
  ['1.2.01.05', 'Edificios y mejoras', {
    corriente: false, niif: 17,
    descripcion: 'Edificaciones y obras de construcción (CAByS 53, 54 y 7212). El terreno se separa porque no se deprecia.',
    seDebita: 'Adquisición o construcción.',
    seAcredita: 'Ventas o bajas.',
  }],
  ['1.2.02', 'Depreciación acumulada', { corriente: false, niif: 17 }],
  ['1.2.02.01', 'Depreciación acumulada de propiedades, planta y equipo', {
    corriente: false, naturaleza: 'acreedora', niif: 17,
    descripcion: 'Cuenta correctora: distribución sistemática del importe depreciable a lo largo de la vida útil, desde que el activo está disponible para su uso.',
    seDebita: 'Bajas de activos.',
    seAcredita: 'Gasto por depreciación del periodo (asiento de ajuste).',
  }],
  ['1.2.03', 'Activos intangibles', { corriente: false, niif: 18 }],
  ['1.2.03.01', 'Programas de cómputo y licencias', {
    corriente: false, niif: 18,
    descripcion: 'Activos identificables sin apariencia física adquiridos a terceros (Sección 18).',
    seDebita: 'Adquisición (reclasificación del CPI).',
    seAcredita: 'Bajas.',
  }],
  ['1.2.03.02', 'Amortización acumulada de intangibles', {
    corriente: false, naturaleza: 'acreedora', niif: 18,
    descripcion: 'Cuenta correctora por la amortización de los intangibles.',
    seDebita: 'Bajas.',
    seAcredita: 'Gasto por amortización del periodo.',
  }],

  ['2', 'PASIVO', { descripcion: 'Obligaciones presentes surgidas de sucesos pasados, cuya liquidación se espera que resulte en una salida de recursos (Sección 2).' }],
  ['2.1', 'Pasivo corriente', { corriente: true }],
  ['2.1.01', 'Cuentas por pagar comerciales', { corriente: true, niif: 11 }],
  ['2.1.01.01', 'Proveedores', {
    corriente: true, niif: 11,
    descripcion: 'Obligaciones por compras a crédito de bienes y servicios.',
    seDebita: 'Pagos (incluido el Recibo Electrónico de Pago) y notas de crédito recibidas.',
    seAcredita: 'Compras a crédito y notas de débito recibidas.',
  }],
  ['2.1.02', 'Impuestos por pagar', { corriente: true }],
  ['2.1.02.01', 'IVA repercutido (débito fiscal)', {
    corriente: true,
    descripcion: 'IVA cobrado en las ventas, que se adeuda a la Administración Tributaria. Nunca es ingreso.',
    seDebita: 'Notas de crédito emitidas y compensación con el IVA acreditable.',
    seAcredita: 'Ventas gravadas y notas de débito emitidas.',
  }],
  ['2.1.02.02', 'IVA por devengar', {
    corriente: true,
    descripcion: 'IVA de ventas a crédito con pago diferido del impuesto hasta 90 días (condición de venta 10, art. 27 de la Ley del IVA) o de servicios al Estado (condición 08); se devenga al cobrar.',
    seDebita: 'Cobro documentado con Recibo Electrónico de Pago (traslado a IVA repercutido).',
    seAcredita: 'Ventas con condición 08 o 10.',
  }],
  ['2.1.02.03', 'Otros impuestos por pagar', {
    corriente: true,
    descripcion: 'Impuestos distintos del IVA incluidos en los comprobantes (selectivo de consumo, específicos y otros de la nota 8).',
    seDebita: 'Pago a la Administración.',
    seAcredita: 'Ventas afectas.',
  }],
  ['2.1.02.04', 'Impuesto sobre la renta por pagar', {
    corriente: true, niif: 29,
    descripcion: 'Impuesto corriente sobre la renta del periodo (Sección 29).',
    seDebita: 'Pagos parciales y liquidación.',
    seAcredita: 'Provisión del impuesto (asiento de ajuste).',
  }],
  ['2.1.03', 'Otras cuentas por pagar', { corriente: true }],
  ['2.1.03.01', 'Cobros por cuenta de terceros', {
    corriente: true,
    descripcion: 'Otros cargos cobrados al cliente que pertenecen a terceros: timbres, contribuciones parafiscales, impuesto de servicio 10 %, cobros de terceros y depósitos de garantía.',
    seDebita: 'Traslado del monto al tercero.',
    seAcredita: 'Otros cargos incluidos en las ventas.',
  }],
  ['2.1.03.02', 'Gastos acumulados por pagar', {
    corriente: true, niif: 21,
    descripcion: 'Gastos devengados al cierre que aún no se han facturado ni pagado (servicios, intereses, cargas sociales).',
    seDebita: 'Pago o recepción de la factura.',
    seAcredita: 'Asiento de ajuste por el gasto devengado.',
  }],
  ['2.2', 'Pasivo no corriente', { corriente: false }],
  ['2.2.01', 'Obligaciones financieras', { corriente: false, niif: 11 }],
  ['2.2.01.01', 'Préstamos bancarios a largo plazo', {
    corriente: false, niif: 11,
    descripcion: 'Préstamos con vencimiento mayor a doce meses.',
    seDebita: 'Amortizaciones.',
    seAcredita: 'Desembolsos recibidos.',
  }],

  ['3', 'PATRIMONIO', { descripcion: 'Participación residual en los activos de la entidad, una vez deducidos todos sus pasivos (Secciones 2 y 22).' }],
  ['3.1', 'Capital'],
  ['3.1.01', 'Capital social', { niif: 22 }],
  ['3.1.01.01', 'Capital social pagado', {
    niif: 22,
    descripcion: 'Aportes de los socios. Se registra en el asiento de apertura del libro de inventarios y balances.',
    seDebita: 'Disminuciones de capital.',
    seAcredita: 'Aportes de los socios.',
  }],
  ['3.2', 'Reservas'],
  ['3.2.01', 'Reserva legal', {}],
  ['3.2.01.01', 'Reserva legal', {
    descripcion: 'Reserva obligatoria de las utilidades netas que exige el Código de Comercio a las sociedades.',
    seDebita: 'Aplicación de la reserva.',
    seAcredita: 'Asignación anual de utilidades.',
  }],
  ['3.3', 'Resultados'],
  ['3.3.01', 'Resultados acumulados', {}],
  ['3.3.01.01', 'Utilidades acumuladas', {
    descripcion: 'Resultados de periodos anteriores no distribuidos.',
    seDebita: 'Pérdidas trasladadas y dividendos.',
    seAcredita: 'Utilidades trasladadas al cierre.',
  }],

  ['4', 'INGRESOS', { descripcion: 'Incrementos en los beneficios económicos del periodo que aumentan el patrimonio, distintos de los aportes de los socios.' }],
  ['4.1', 'Ingresos de actividades ordinarias', { niif: 23 }],
  ['4.1.01', 'Ventas', { niif: 23 }],
  ['4.1.01.01', 'Ventas de mercancías', {
    niif: 23,
    descripcion: 'Ventas de bienes (CAByS 0 a 4) neto de descuentos; el IVA no forma parte del ingreso.',
    seDebita: 'Cierre del periodo.',
    seAcredita: 'Facturas, tiquetes y notas de débito emitidos.',
  }],
  ['4.1.01.02', 'Ingresos por servicios', {
    niif: 23,
    descripcion: 'Prestación de servicios (CAByS 5 a 9) neto de descuentos.',
    seDebita: 'Cierre del periodo.',
    seAcredita: 'Facturas, tiquetes y notas de débito emitidos.',
  }],
  ['4.1.01.03', 'Ventas de exportación', {
    niif: 23,
    descripcion: 'Ventas documentadas con Factura Electrónica de Exportación (exentas con derecho a crédito).',
    seDebita: 'Cierre del periodo.',
    seAcredita: 'Facturas electrónicas de exportación.',
  }],
  ['4.1.01.04', 'Devoluciones y descuentos sobre ventas', {
    niif: 23, naturaleza: 'deudora',
    descripcion: 'Cuenta correctora del ingreso: notas de crédito emitidas por devoluciones, descuentos o anulaciones.',
    seDebita: 'Notas de crédito emitidas.',
    seAcredita: 'Cierre del periodo.',
  }],
  ['4.2', 'Otros ingresos'],
  ['4.2.01', 'Otros ingresos', {}],
  ['4.2.01.01', 'Otros ingresos', {
    descripcion: 'Intereses moratorios, multas cobradas y otros cargos que pertenecen a la entidad.',
    seDebita: 'Cierre del periodo.',
    seAcredita: 'Otros cargos 09 y 10 de los comprobantes emitidos.',
  }],

  ['5', 'COSTOS', { descripcion: 'Costo de los bienes vendidos.' }],
  ['5.1', 'Costo de ventas', { niif: 13 }],
  ['5.1.01', 'Costo de ventas', { niif: 13 }],
  ['5.1.01.01', 'Costo de mercancías vendidas', {
    niif: 13,
    descripcion: 'Valor en libros del inventario vendido, al costo promedio ponderado, reconocido en el mismo periodo que el ingreso (Sección 13).',
    seDebita: 'Salida de inventario por cada venta de mercadería.',
    seAcredita: 'Devoluciones de clientes y cierre del periodo.',
  }],

  ['6', 'GASTOS', { descripcion: 'Decrementos en los beneficios económicos del periodo. Se registran conforme a la NIIF aunque no sean deducibles; la diferencia fiscal se concilia aparte (Sección 29).' }],
  ['6.1', 'Gastos de operación'],
  ['6.1.01', 'Gastos administrativos y de ventas', {}],
  ['6.1.01.01', 'Servicios profesionales', {
    descripcion: 'Servicios jurídicos, contables, de consultoría, técnicos e investigación (CAByS 81, 82 y 83).',
    seDebita: 'Compras de servicios profesionales.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.02', 'Alquileres', {
    niif: 20,
    descripcion: 'Arrendamientos de inmuebles, vehículos y equipo (CAByS 7211 y 73) tratados como operativos (Sección 20).',
    seDebita: 'Facturas de alquiler.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.03', 'Servicios públicos y telecomunicaciones', {
    descripcion: 'Electricidad, agua, gas (CAByS 69), telefonía, internet e información (CAByS 84).',
    seDebita: 'Facturas de servicios.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.04', 'Suministros y materiales', {
    descripcion: 'Bienes de consumo que no son para la venta y equipo menor bajo el umbral de capitalización.',
    seDebita: 'Compras de suministros.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.05', 'Combustibles y lubricantes', {
    descripcion: 'Productos refinados del petróleo (CAByS 333).',
    seDebita: 'Compras de combustible.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.06', 'Mantenimiento y reparaciones', {
    descripcion: 'Servicios de mantenimiento, reparación e instalación (CAByS 87) y obras menores bajo el umbral.',
    seDebita: 'Facturas de mantenimiento.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.07', 'Fletes y transporte', {
    descripcion: 'Transporte de pasajeros y de carga, servicios de apoyo al transporte y mensajería (CAByS 64 a 68).',
    seDebita: 'Facturas de transporte.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.08', 'Alimentación y atenciones', {
    descripcion: 'Servicios de alojamiento y de comidas (CAByS 63). Su deducibilidad en renta debe revisarse.',
    seDebita: 'Facturas de restaurantes y hoteles.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.09', 'Capacitación', {
    descripcion: 'Servicios de enseñanza y formación (CAByS 92).',
    seDebita: 'Facturas de capacitación.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.1.01.10', 'IVA asumido en regalías y bonificaciones', {
    descripcion: 'Impuesto que el emisor asume en regalías o bonificaciones (campo ImpuestoAsumidoEmisorFabrica).',
    seDebita: 'Ventas con impuesto asumido.', seAcredita: 'Cierre.',
  }],
  ['6.1.01.11', 'Depreciación y amortización', {
    niif: 17,
    descripcion: 'Gasto por depreciación de propiedades, planta y equipo y amortización de intangibles.',
    seDebita: 'Asiento de ajuste del periodo.', seAcredita: 'Cierre.',
  }],
  ['6.1.01.12', 'Pérdida por deterioro de cuentas por cobrar', {
    niif: 11,
    descripcion: 'Pérdida por deterioro de la cartera de clientes con evidencia objetiva al cierre, evaluada individualmente o en grupo por riesgo crediticio similar.',
    seDebita: 'Asiento de ajuste de la estimación.', seAcredita: 'Reversión de la estimación y cierre.',
  }],
  ['6.1.01.13', 'Seguros', {
    descripcion: 'Primas de seguros devengadas en el periodo.',
    seDebita: 'Ajuste por la porción devengada de los pagos anticipados.', seAcredita: 'Cierre.',
  }],
  ['6.1.01.99', 'Otros gastos de operación', {
    descripcion: 'Gastos que no corresponden a otra cuenta y otros cargos incluidos en facturas de proveedores.',
    seDebita: 'Compras no clasificadas.', seAcredita: 'Notas de crédito y cierre.',
  }],
  ['6.2', 'Gastos financieros'],
  ['6.2.01', 'Gastos financieros', {}],
  ['6.2.01.01', 'Comisiones y servicios financieros', {
    niif: 11,
    descripcion: 'Comisiones bancarias, de tarjetas, seguros y otros servicios financieros (CAByS 71).',
    seDebita: 'Cargos financieros.', seAcredita: 'Cierre.',
  }],
  ['6.2.01.02', 'Diferencias de cambio', {
    niif: 30,
    descripcion: 'Pérdida o ganancia neta por la conversión de partidas monetarias en moneda extranjera (Sección 30).',
    seDebita: 'Pérdidas cambiarias.', seAcredita: 'Ganancias cambiarias.',
  }],
  ['6.3', 'Impuesto sobre la renta'],
  ['6.3.01', 'Impuesto sobre la renta', { niif: 29 }],
  ['6.3.01.01', 'Gasto por impuesto sobre la renta', {
    niif: 29,
    descripcion: 'Impuesto corriente sobre la renta del periodo (Ley 7092). Se presenta después de la utilidad antes de impuesto.',
    seDebita: 'Asiento de ajuste por la provisión del impuesto.', seAcredita: 'Cierre.',
  }],
];

export const CATALOGO_CUENTAS: Cuenta[] = FILAS.map(([codigo, nombre, extra = {}]) => {
  const tipo = tipoPorCodigo(codigo);
  return {
    codigo,
    nombre,
    tipo,
    naturaleza: DEUDORAS.includes(tipo) ? 'deudora' : 'acreedora',
    imputable: codigo.split('.').length === 4,
    ...extra,
  };
});

const POR_CODIGO = new Map(CATALOGO_CUENTAS.map((c) => [c.codigo, c]));

export function cuenta(codigo: string): Cuenta {
  const c = POR_CODIGO.get(codigo);
  if (!c) throw new Error(`La cuenta ${codigo} no existe en el catálogo.`);
  return c;
}

/** Nivel jerárquico: 1 clase, 2 grupo, 3 cuenta, 4 subcuenta. */
export const nivelCuenta = (codigo: string): number => codigo.split('.').length;

/**
 * Marco contable del sistema: Norma de Contabilidad NIIF para las PYMES, tercera edición (IASB,
 * febrero de 2025). Es la única edición que se aplica y se cita.
 */
export const EDICION_NIIF = '2025' as const;
export const NOMBRE_EDICION_NIIF = 'Norma de Contabilidad NIIF para las PYMES, tercera edición (febrero de 2025)';

/** Vigencia obligatoria de la tercera edición (Apéndice A): periodos anuales que comienzan a partir de esta fecha. */
export const VIGENCIA_NIIF_2025 = '2027-01-01';

/**
 * Para periodos que comienzan antes del 1/01/2027 la tercera edición se aplica anticipadamente, lo que
 * está permitido y debe revelarse (Apéndice A, Fecha de vigencia).
 */
export const esAplicacionAnticipadaNiif = (inicioPeriodo: string): boolean => inicioPeriodo < VIGENCIA_NIIF_2025;

/** Secciones 1 a 35 con su nombre en la traducción oficial de la tercera edición (índice de la Norma). */
export const SECCIONES_NIIF: Record<number, string> = {
  1: 'Pequeñas y Medianas Entidades',
  2: 'Conceptos y Principios Fundamentales',
  3: 'Presentación de Estados Financieros',
  4: 'Estado de Situación Financiera',
  5: 'Estado de Resultado Integral y Estado de Resultados',
  6: 'Estado de Cambios en el Patrimonio y Estado de Resultados y Ganancias Acumuladas',
  7: 'Estado de Flujos de Efectivo',
  8: 'Notas a los Estados Financieros',
  9: 'Estados Financieros Consolidados y Separados',
  10: 'Políticas Contables, Cambios en las Estimaciones Contables y Errores',
  11: 'Instrumentos Financieros',
  12: 'Medición del Valor Razonable',
  13: 'Inventarios',
  14: 'Inversiones en Asociadas',
  15: 'Acuerdos Conjuntos',
  16: 'Propiedades de Inversión',
  17: 'Propiedades, Planta y Equipo',
  18: 'Activos Intangibles distintos de la Plusvalía',
  19: 'Combinaciones de Negocios y Plusvalía',
  20: 'Arrendamientos',
  21: 'Provisiones y Contingencias',
  22: 'Pasivos y Patrimonio',
  23: 'Ingresos de Actividades Ordinarias Procedentes de Contratos con Clientes',
  24: 'Subvenciones del Gobierno',
  25: 'Costos por Préstamos',
  26: 'Pagos Basados en Acciones',
  27: 'Deterioro del Valor de los Activos',
  28: 'Beneficios a los Empleados',
  29: 'Impuesto a las Ganancias',
  30: 'Conversión de Moneda Extranjera',
  31: 'Hiperinflación',
  32: 'Hechos Ocurridos después del Periodo sobre el que se Informa',
  33: 'Información a Revelar sobre Partes Relacionadas',
  34: 'Actividades Especializadas',
  35: 'Transición a la Norma de Contabilidad NIIF para las PYMES',
};

/** Cita de una sección de la tercera edición: «NIIF para las PYMES (2025), Sección 17 «Propiedades, Planta y Equipo»». */
export function seccionNiif(numero: number): string {
  const nombre = SECCIONES_NIIF[numero];
  if (!nombre) throw new Error(`La NIIF para las PYMES (${EDICION_NIIF}) no tiene la Sección ${numero}.`);
  return `NIIF para las PYMES (${EDICION_NIIF}), Sección ${numero} «${nombre}»`;
}
