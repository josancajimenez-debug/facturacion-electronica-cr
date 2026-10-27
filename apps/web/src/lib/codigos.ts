/**
 * Códigos de los comprobantes ordenados según el proceso de uso. Las listas son las mismas que
 * usa el simulador (packages/core/src/catalogos.ts); aquí solo se agrupan y se explica para qué
 * sirve cada catálogo, con su cita APA 7 (mismas referencias que lib/glosario.ts).
 */
import {
  CODIGO_DESCUENTO,
  CODIGO_IMPUESTO,
  CODIGO_REFERENCIA,
  CODIGO_TIPO_DOCUMENTO,
  CONDICION_IMPUESTO,
  CONDICION_VENTA,
  FORMA_FARMACEUTICA,
  INSTITUCION_EXONERACION,
  MEDIO_PAGO,
  MENSAJE,
  MONEDA,
  NOMBRE_COMPROBANTE,
  PROVINCIA,
  SITUACION,
  TARIFA_IVA,
  TIPO_CODIGO_COMERCIAL,
  TIPO_DOC_REFERENCIA,
  TIPO_EXONERACION,
  TIPO_IDENTIFICACION,
  TIPO_OTROS_CARGOS,
  TIPO_TRANSACCION,
  UNIDAD_MEDIDA,
  type Codigo,
  type TipoComprobante,
} from '@fe-cr/core';

export interface Catalogo {
  titulo: string;
  /** Para qué sirve el código y dónde se indica en el comprobante. */
  uso: string;
  fuente: string;
  codigos: Codigo[];
}

export interface Paso {
  titulo: string;
  descripcion: string;
  catalogos: Catalogo[];
}

const MENSAJES_RECEPTOR: Record<string, string> = {
  '05': 'Confirmación de aceptación del comprobante electrónico',
  '06': 'Confirmación de aceptación parcial del comprobante electrónico',
  '07': 'Confirmación de rechazo del comprobante electrónico',
};

const TIPO_COMPROBANTE: Codigo[] = Object.entries(CODIGO_TIPO_DOCUMENTO)
  .map(([sigla, codigo]) => ({
    codigo,
    descripcion: MENSAJES_RECEPTOR[codigo] ?? `${NOMBRE_COMPROBANTE[sigla as TipoComprobante]} (${sigla})`,
    nota: MENSAJES_RECEPTOR[codigo] ? 'Lo emite el receptor al confirmar un comprobante recibido.' : undefined,
  }))
  .sort((a, b) => a.codigo.localeCompare(b.codigo));

export const PASOS: Paso[] = [
  {
    titulo: '1. Identificar el comprobante y a las partes',
    descripcion: 'Códigos del encabezado: qué documento se emite, en qué circunstancias y quiénes intervienen.',
    catalogos: [
      {
        titulo: 'Tipo de comprobante',
        uso: 'Posiciones 9 y 10 del consecutivo de 20 dígitos. Indica qué documento se emite; los códigos 05 a 07 son los mensajes de confirmación del receptor.',
        fuente: '(DGT, 2024a, nota 3)',
        codigos: TIPO_COMPROBANTE,
      },
      {
        titulo: 'Situación del comprobante',
        uso: 'Dígito 42 de la clave numérica. Indica si el comprobante se generó en condiciones normales, sustituye uno físico de contingencia o se generó sin acceso a internet.',
        fuente: '(DGT, 2024a, nota 3, p. 68)',
        codigos: SITUACION,
      },
      {
        titulo: 'Tipo de identificación',
        uso: 'Tipo de documento de identidad del emisor y del receptor; define cuántos caracteres lleva el número.',
        fuente: '(DGT, 2024a, nota 4)',
        codigos: TIPO_IDENTIFICACION,
      },
      {
        titulo: 'Provincia',
        uso: 'Primer nivel de la ubicación del emisor y del receptor. El cantón y el distrito siguen la División Territorial Administrativa 2022.',
        fuente: '(DGT, 2024a, nota 14); (Instituto Geográfico Nacional y Registro Nacional, 2022)',
        codigos: PROVINCIA,
      },
      {
        titulo: 'Moneda',
        uso: 'Moneda en que se realizó la operación, con el código ISO de la tabla oficial. Si no es colones, se indica también el tipo de cambio.',
        fuente: '(DGT, 2024a, nota 13.1); (DGT, s. f.-b)',
        codigos: MONEDA,
      },
    ],
  },
  {
    titulo: '2. Pactar la venta y el pago',
    descripcion: 'Cómo se acuerda la operación y con qué se paga.',
    catalogos: [
      {
        titulo: 'Condición de la venta',
        uso: 'Forma en que se pacta la operación. Determina, por ejemplo, si se indica el plazo del crédito o si el pago posterior se respalda con un Recibo Electrónico de Pago.',
        fuente: '(DGT, 2024a, nota 5)',
        codigos: CONDICION_VENTA,
      },
      {
        titulo: 'Medio de pago',
        uso: 'Forma en que se paga, en el resumen del comprobante. Si se usan varios medios, se indica el monto de cada uno y deben sumar el total.',
        fuente: '(DGT, 2024a, nota 6)',
        codigos: MEDIO_PAGO,
      },
    ],
  },
  {
    titulo: '3. Describir cada línea del detalle',
    descripcion: 'Códigos de cada bien o servicio: cómo se identifica, se mide, se descuenta y se grava. El código del producto es el CAByS de 13 dígitos (nota 17), que se consulta en Productos y servicios.',
    catalogos: [
      {
        titulo: 'Tipo de código comercial',
        uso: 'Origen del código propio del producto que se agrega al CAByS.',
        fuente: '(DGT, 2024a, nota 12)',
        codigos: TIPO_CODIGO_COMERCIAL,
      },
      {
        titulo: 'Unidad de medida',
        uso: 'Unidad en que se expresa la cantidad de la línea. Los servicios usan unidades como Sp (servicios profesionales) u Os (otro tipo de servicio).',
        fuente: '(DGT, 2024a, nota 15)',
        codigos: UNIDAD_MEDIDA,
      },
      {
        titulo: 'Forma farmacéutica',
        uso: 'Presentación del medicamento, obligatoria en las líneas de medicamentos junto con su registro sanitario.',
        fuente: '(DGT, 2024a, nota 19); (DGT, s. f.-a)',
        codigos: FORMA_FARMACEUTICA,
      },
      {
        titulo: 'Tipo de transacción',
        uso: 'Naturaleza de la línea: venta normal, autoconsumo, cuota de afiliación, bien de capital o entrega sin contraprestación.',
        fuente: '(DGT, 2024a, nota 22)',
        codigos: TIPO_TRANSACCION,
      },
      {
        titulo: 'Tipo de descuento',
        uso: 'Motivo de cada descuento aplicado a la línea. Una regalía (01) se factura al precio total y el emisor asume el IVA.',
        fuente: '(DGT, 2024a, nota 20)',
        codigos: CODIGO_DESCUENTO,
      },
      {
        titulo: 'Código del impuesto',
        uso: 'Impuesto que grava la línea. Una línea puede llevar varios, por ejemplo selectivo de consumo e IVA.',
        fuente: '(DGT, 2024a, nota 8)',
        codigos: CODIGO_IMPUESTO,
      },
      {
        titulo: 'Tarifa del IVA',
        uso: 'Tarifa aplicada cuando el impuesto es el IVA (código 01). Define si la línea se suma como gravada, exenta o no sujeta en el resumen.',
        fuente: '(DGT, 2024a, nota 8.1); (Asamblea Legislativa de la República de Costa Rica, 1982, arts. 10–11)',
        codigos: TARIFA_IVA,
      },
      {
        titulo: 'Tipo de documento de exoneración',
        uso: 'Documento que autoriza la exoneración del impuesto de la línea; se indica con su número, fecha y porcentaje exonerado.',
        fuente: '(DGT, 2024a, nota 10.1)',
        codigos: TIPO_EXONERACION,
      },
      {
        titulo: 'Institución que emitió la exoneración',
        uso: 'Entidad que otorgó el documento de exoneración.',
        fuente: '(DGT, 2024a, nota 23)',
        codigos: INSTITUCION_EXONERACION,
      },
      {
        titulo: 'Tipo de otros cargos',
        uso: 'Montos que se cobran junto con la venta pero que no son el bien o servicio, como timbres o el impuesto de servicio.',
        fuente: '(DGT, 2024a, nota 16)',
        codigos: TIPO_OTROS_CARGOS,
      },
    ],
  },
  {
    titulo: '4. Referenciar, corregir, sustituir o pagar',
    descripcion: 'Información de referencia: obligatoria en notas de crédito y débito, sustitutos y recibos de pago. Un comprobante no se anula directamente; se ajusta con estos códigos.',
    catalogos: [
      {
        titulo: 'Tipo de documento de referencia',
        uso: 'Qué documento se está referenciando.',
        fuente: '(DGT, 2024a, nota 10); (DGT, 2026)',
        codigos: TIPO_DOC_REFERENCIA,
      },
      {
        titulo: 'Código de referencia',
        uso: 'Por qué se referencia el documento: anularlo, corregir su monto, sustituirlo o aplicarle un pago. Los códigos 13 a 17 son obligatorios en los sistemas desde el 1 de noviembre de 2026.',
        fuente: '(DGT, 2024a, nota 9); (DGT, 2026)',
        codigos: CODIGO_REFERENCIA,
      },
    ],
  },
  {
    titulo: '5. Recibir y confirmar',
    descripcion: 'Códigos del mensaje con que el receptor confirma un comprobante, en un plazo de 8 días hábiles desde el primer día del mes siguiente.',
    catalogos: [
      {
        titulo: 'Mensaje del receptor',
        uso: 'Resultado de la confirmación: aceptación total, aceptación parcial o rechazo.',
        fuente: '(DGT, 2024a, nota 11); (DGT, 2024b, art. 10)',
        codigos: MENSAJE,
      },
      {
        titulo: 'Condición del impuesto',
        uso: 'Tratamiento que el receptor da al IVA del comprobante aceptado en su declaración.',
        fuente: '(DGT, 2024a, nota 18)',
        codigos: CONDICION_IMPUESTO,
      },
    ],
  },
];
