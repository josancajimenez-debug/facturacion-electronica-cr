/**
 * Glosario de facturación electrónica elaborado el 26/10/2026 con la bibliografía adjunta
 * (Decreto 44739-H, RES-0027-2024, Anexos y Estructuras v4.4 y demás normas de la matriz).
 * Citas y referencias en formato APA 7.ª edición, con el mismo criterio de autor de la matriz
 * (Asamblea Legislativa, Poder Ejecutivo, DGT); en las referencias, *texto* va en cursiva.
 */
export const FECHA_GLOSARIO = '26 de octubre de 2026';

export interface Termino {
  termino: string;
  definicion: string;
  fuente: string;
}

export interface Referencia {
  texto: string;
  url?: string;
}

const D = 'Poder Ejecutivo de la República de Costa Rica, 2024';
const R27 = 'DGT, 2024b';

export const TERMINOS: Termino[] = [
  {
    termino: 'Administración Tributaria',
    definicion: 'Órgano administrativo encargado de administrar, gestionar y fiscalizar los tributos: la Dirección General de Tributación, las Direcciones Funcionales, las Administraciones Tributarias Territoriales y la Dirección de Grandes Contribuyentes Nacionales, según su competencia.',
    fuente: `(${D}, art. 2, inc. 1)`,
  },
  {
    termino: 'Anulación de un comprobante',
    definicion: 'Un comprobante válidamente emitido no se anula directamente: sus efectos contables se anulan o modifican con una nota de crédito o débito, y el documento original queda inalterable y no puede reutilizarse.',
    fuente: `(${R27}, art. 9)`,
  },
  {
    termino: 'Archivo XML',
    definicion: 'Documento en formato Extensible Markup Language (Lenguaje Extensible de Etiquetado) que permite transmitir documentos entre plataformas y validarlos e interpretarlos entre aplicaciones y organizaciones.',
    fuente: `(${D}, art. 2, inc. 2)`,
  },
  {
    termino: 'Beneficio fiscal',
    definicion: 'Mecanismo que reduce la carga tributaria del contribuyente. Los más comunes son la exención, la reducción de tarifas, la subvención, la devolución y la bonificación fiscal.',
    fuente: `(${D}, art. 2, inc. 3)`,
  },
  {
    termino: 'Bitácora (controles y registros)',
    definicion: 'Registro de cada transacción que deben llevar los sistemas de emisión, para que la Administración Tributaria pueda ejercer el control tributario en forma integral.',
    fuente: `(${R27}, art. 6)`,
  },
  {
    termino: 'CAByS (Catálogo de Bienes y Servicios)',
    definicion: 'Catálogo desarrollado por el BCCR con el Ministerio de Hacienda para codificar los bienes y servicios que se comercializan en Costa Rica. Su código de 13 dígitos se indica en cada línea del comprobante y permite identificar los productos con impuesto diferenciado.',
    fuente: '(Banco Central de Costa Rica y Ministerio de Hacienda, 2025); (DGT, 2024a, nota 17)',
  },
  {
    termino: 'Clave numérica',
    definicion: 'Conjunto de 50 dígitos que identifica de forma única cada comprobante: código de país (506), fecha, identificación del emisor, número consecutivo, situación del comprobante y código de seguridad de 8 dígitos. La genera el sistema del obligado tributario de forma automática.',
    fuente: `(${R27}, art. 3); (DGT, 2024a, nota 3)`,
  },
  {
    termino: 'Código de actividad económica',
    definicion: 'Código de la actividad inscrita del emisor y, desde la v4.4, también del receptor. Con la entrada de TRIBU-CR se expresa en la clasificación CIIU 4.',
    fuente: '(DGT, 2024a, bitácora 4.4.0); (DGT, 2025b)',
  },
  {
    termino: 'Código de referencia',
    definicion: 'Código que explica por qué un comprobante remite a otro: 01 anula, 02 corrige monto, 06 devolución de mercancía, 07 sustituye, 13 a 15 por error material, 16 sustituye un comprobante rechazado y 17 pago a un comprobante electrónico, entre otros. Los códigos 13 a 17 son obligatorios en los sistemas desde el 1 de noviembre de 2026.',
    fuente: '(DGT, 2024a, nota 9); (DGT, 2026)',
  },
  {
    termino: 'Código QR (Código de Respuesta Rápida)',
    definicion: 'Sistema que almacena información de forma bidimensional en una matriz de puntos y da acceso ágil a ella. En la representación gráfica va en la parte inferior derecha, de al menos 2,5 × 2,5 cm.',
    fuente: `(${D}, art. 2, inc. 4); (${R27}, arts. 4–5)`,
  },
  {
    termino: 'Comprobante de aceptación total, parcial o rechazo',
    definicion: 'Documento electrónico con el que el receptor confirma la aceptación total o parcial, o el rechazo, de un comprobante recibido, para los efectos fiscales o comerciales que correspondan.',
    fuente: `(${D}, art. 2, inc. 5)`,
  },
  {
    termino: 'Comprobante electrónico',
    definicion: 'Documento electrónico en formato XML, autorizado por la Administración Tributaria, que respalda la venta o adquisición de bienes y la prestación de servicios. Debe generarse, expresarse y transmitirse en el mismo acto de la compraventa o prestación del servicio.',
    fuente: `(${D}, art. 2, inc. 6)`,
  },
  {
    termino: 'Comprobante provisional por contingencia',
    definicion: 'Comprobante preimpreso por una imprenta autorizada, o emitido por un sistema computarizado conforme a la norma, que se usa solo cuando el sistema de comprobantes electrónicos no puede utilizarse por causas ajenas al emisor.',
    fuente: `(${D}, art. 2, inc. 7, y art. 23)`,
  },
  {
    termino: 'Condición de la venta',
    definicion: 'Código que indica cómo se pacta la operación: 01 contado, 02 crédito, 03 consignación, 04 apartado, 08 servicios prestados al Estado, 10 venta a crédito con IVA hasta 90 días, 99 otros, entre otros.',
    fuente: '(DGT, 2024a, nota 5)',
  },
  {
    termino: 'Condición del impuesto',
    definicion: 'Código con el que el receptor indica el tratamiento del IVA al confirmar un comprobante: 01 genera crédito, 02 crédito parcial, 03 bienes de capital, 04 gasto corriente sin crédito y 05 proporcionalidad.',
    fuente: '(DGT, 2024a, nota 18)',
  },
  {
    termino: 'Confirmación del receptor',
    definicion: 'Mensaje con el que un emisor receptor electrónico o un receptor electrónico no emisor acepta total o parcialmente, o rechaza, un comprobante (códigos 1 aceptado, 2 aceptación parcial y 3 rechazado). Es obligatorio para respaldar compras en las declaraciones autoliquidativas y debe enviarse en un plazo de 8 días hábiles desde el primer día del mes siguiente a la operación; sin confirmación, se presume aceptado totalmente.',
    fuente: `(${R27}, art. 10); (DGT, 2024a, nota 11)`,
  },
  {
    termino: 'Consecutivo (numeración consecutiva)',
    definicion: 'Número de 20 dígitos que el sistema asigna de forma automática y consecutiva: sucursal (3), terminal o punto de venta (5), tipo de comprobante (2) y número del comprobante (10).',
    fuente: `(${R27}, art. 2); (DGT, 2024a, nota 3)`,
  },
  {
    termino: 'Contingencia',
    definicion: 'Situación 2 de la clave. Corresponde a los comprobantes electrónicos que sustituyen al comprobante físico emitido por contingencia.',
    fuente: '(DGT, 2024a, nota 3, p. 68)',
  },
  {
    termino: 'Correo electrónico válido',
    definicion: 'Correo que cumple las especificaciones técnicas de los Anexos y Estructuras. El emisor receptor electrónico debe tenerlo registrado ante la Administración Tributaria.',
    fuente: `(${D}, art. 2, inc. 8, y art. 4)`,
  },
  {
    termino: 'Descuento',
    definicion: 'Rebaja aplicada a una línea del comprobante, que se identifica con un código: 01 regalía, 02 regalía o bonificación con IVA cobrado al cliente, 03 bonificación, 04 volumen, 05 temporada, 06 promocional, 07 comercial, 08 frecuencia, 09 sostenido y 99 otros.',
    fuente: '(DGT, 2024a, nota 20)',
  },
  {
    termino: 'Emisor receptor electrónico',
    definicion: 'Obligado tributario, persona física o jurídica, autorizado por la Administración Tributaria para emitir, enviar, recibir y confirmar comprobantes electrónicos por medio de un sistema informático.',
    fuente: `(${D}, art. 2, inc. 9)`,
  },
  {
    termino: 'Emisor receptor electrónico no confirmante',
    definicion: 'Contribuyente inscrito en un régimen especial que no lo obliga a emitir comprobantes, pero que se inscribe voluntariamente para emitirlos y recibirlos. Queda eximido de confirmarlos para respaldar gastos y créditos.',
    fuente: `(${D}, art. 2, inc. 10)`,
  },
  {
    termino: 'Entrega del comprobante electrónico',
    definicion: 'Se cumple cuando, en el mismo acto de la emisión, el obligado tributario envía o pone a disposición el comprobante por un medio electrónico o, si el receptor es consumidor final, imprime y entrega su representación gráfica. No emitirlo o no entregarlo se sanciona con base en los artículos 85 y 86 del CNPT.',
    fuente: `(${D}, art. 2, inc. 11); (Asamblea Legislativa de la República de Costa Rica, 1971, arts. 85–86)`,
  },
  {
    termino: 'Exoneración',
    definicion: 'Beneficio fiscal que reduce o elimina el impuesto de una línea. El comprobante registra el documento que la autoriza y la institución que la emitió (01 Ministerio de Hacienda, 02 Relaciones Exteriores y Culto, 03 MAG, 04 MEIC, entre otras).',
    fuente: `(${D}, art. 2, inc. 3); (DGT, 2024a, nota 23)`,
  },
  {
    termino: 'Factura electrónica (FE)',
    definicion: 'Comprobante electrónico autorizado por la Administración Tributaria que respalda la venta de bienes y la prestación de servicios, generado y transmitido en el mismo acto de la compraventa o prestación del servicio.',
    fuente: `(${D}, art. 2, inc. 12)`,
  },
  {
    termino: 'Factura electrónica como título ejecutivo',
    definicion: 'La factura electrónica puede constituir título ejecutivo cuando cuenta con la aceptación del comprador, que puede darse por comprobantes o mensajes de confirmación firmados, conforme al procedimiento de la DGT.',
    fuente: '(Asamblea Legislativa de la República de Costa Rica, 1964, arts. 460, 460 bis y 460 ter)',
  },
  {
    termino: 'Factura electrónica de compra (FEC)',
    definicion: 'Documento que emite el adquirente de un bien o servicio cuando el vendedor no está obligado a emitir comprobantes, está en el régimen especial agropecuario, es un proveedor no domiciliado o es una persona física no inscrita. Procede, por ejemplo, con el régimen de tributación simplificada (no obligado a emitir, art. 7 inc. 1) y con el régimen especial agropecuario, referenciando el comprobante que entregó el vendedor (tipo 14). No aplica a contribuyentes del régimen simplificado inscritos como emisores receptores no confirmantes (ellos emiten su comprobante), al transporte público ni a pagos al Estado por sus actividades habituales.',
    fuente: `(${D}, art. 2, inc. 13)`,
  },
  {
    termino: 'Factura electrónica de exportación (FEE)',
    definicion: 'Comprobante que se usa para exportar mercancías y para prestar servicios o vender bienes intangibles desde el territorio nacional hacia el exterior.',
    fuente: `(${D}, art. 2, inc. 14)`,
  },
  {
    termino: 'Firma digital',
    definicion: 'La definida en el artículo 8 de la Ley N.° 8454, Ley de Certificados, Firmas Digitales y Documentos Electrónicos. En los comprobantes se aplica con el formato XAdES-EPES descrito en el Anexo 2.',
    fuente: `(${D}, art. 2, inc. 15); (DGT, 2024a, anexo 2)`,
  },
  {
    termino: 'IVA devuelto',
    definicion: 'Monto del IVA que se devuelve cuando se facturan servicios de salud pagados con tarjeta. Si todo se paga con tarjeta, es el IVA de esos servicios; con varios medios de pago u otros productos, se calcula como (monto pagado con tarjeta / venta neta) × monto del impuesto.',
    fuente: '(DGT, 2024a, campo «IVA Devuelto» del resumen)',
  },
  {
    termino: 'Llave criptográfica del Ministerio de Hacienda',
    definicion: 'Método de seguridad que garantiza la integridad, autenticidad y autoría de los comprobantes electrónicos.',
    fuente: `(${D}, art. 2, inc. 16)`,
  },
  {
    termino: 'Mecanismo de seguridad',
    definicion: 'La firma digital, la llave criptográfica o el sello electrónico, según corresponda.',
    fuente: `(${D}, art. 2, inc. 17)`,
  },
  {
    termino: 'Medio de pago',
    definicion: 'Código de la forma en que se paga: 01 efectivo, 02 tarjeta, 03 cheque, 04 transferencia o depósito bancario, 05 recaudado por terceros, 06 SINPE Móvil, 07 plataforma digital y 99 otros. Desde la v4.4 se informa en el resumen del comprobante.',
    fuente: '(DGT, 2024a, nota 6 y bitácora 4.4.0)',
  },
  {
    termino: 'Mensaje de respuesta del Ministerio de Hacienda',
    definicion: 'Documento electrónico en XML que indica al emisor el resultado de la validación del comprobante: aceptación o rechazo. Hacienda dispone de un máximo de 3 horas desde la recepción para enviarlo.',
    fuente: `(${D}, art. 2, inc. 18); (${R27}, art. 11)`,
  },
  {
    termino: 'Nota de crédito (NC) y nota de débito (ND) electrónicas',
    definicion: 'Comprobantes electrónicos autorizados que permiten anular o modificar los efectos contables de la factura electrónica, la factura de exportación o el tiquete electrónico, sin alterar la información del documento de origen.',
    fuente: `(${D}, art. 2, inc. 19)`,
  },
  {
    termino: 'Otros cargos',
    definicion: 'Montos que se cobran junto con la venta pero no son el bien o servicio: contribución parafiscal, timbres de la Cruz Roja, Bomberos o colegios profesionales, cobro de un tercero, impuesto de servicio del 10 %, depósitos de garantía, multas, intereses moratorios y otros.',
    fuente: '(DGT, 2024a, nota 16)',
  },
  {
    termino: 'Plazo de conservación',
    definicion: 'Los comprobantes generados, enviados y recibidos, y sus documentos asociados, se conservan cinco años en el soporte electrónico que se prefiera, garantizando su integridad, legibilidad y consulta posterior.',
    fuente: `(${D}, art. 22); (Asamblea Legislativa de la República de Costa Rica, 1971, art. 109)`,
  },
  {
    termino: 'Proveedor de sistemas de comprobantes electrónicos',
    definicion: 'Quien pone a disposición de los obligados tributarios inscritos un sistema para emitir, entregar y confirmar comprobantes electrónicos. Desde la v4.4 se identifica en el campo «Proveedor de Sistemas» del comprobante.',
    fuente: `(${D}, art. 2, inc. 20); (DGT, 2024a, bitácora 4.4.0)`,
  },
  {
    termino: 'Receptor electrónico no emisor',
    definicion: 'Las instituciones de la Administración Pública, las personas físicas o jurídicas con beneficios fiscales y los demás sujetos del artículo 7 del Reglamento.',
    fuente: `(${D}, art. 2, inc. 21)`,
  },
  {
    termino: 'Receptor manual',
    definicion: 'Persona física o jurídica que, como obligado tributario o consumidor final, recibe impresa la representación gráfica del comprobante. Para un obligado tributario, esa impresión no surte efectos tributarios ni respalda créditos o gastos.',
    fuente: `(${D}, art. 2, inc. 22)`,
  },
  {
    termino: 'Rechazo de Hacienda (comprobante rechazado)',
    definicion: 'Cuando el mensaje de Hacienda es de rechazo, el comprobante carece de validez; por eso no se le hace nota de crédito ni de débito, sino que se emite un comprobante sustituto.',
    fuente: `(${R27}, art. 9)`,
  },
  {
    termino: 'Recibo electrónico de pago (REP)',
    definicion: 'Comprobante autorizado que respalda el pago parcial de ventas de bienes o servicios a crédito con pago diferido, conforme a los artículos 3 inciso 8 y 27 de la Ley del IVA, y a otras condiciones que fije la Administración.',
    fuente: `(${D}, art. 2, inc. 23); (Asamblea Legislativa de la República de Costa Rica, 1982, art. 27)`,
  },
  {
    termino: 'Registro Único Tributario (RUT) y números SINPE Móvil',
    definicion: 'Registro en el que el emisor debe estar inscrito con un correo electrónico válido. Desde el Decreto 45953-H, también debe registrar los teléfonos SINPE Móvil que use como medio de pago; omitirlo se sanciona con base en el artículo 83 del CNPT.',
    fuente: `(${D}, art. 4); (Poder Ejecutivo de la República de Costa Rica, 2026)`,
  },
  {
    termino: 'Representación gráfica',
    definicion: 'Documento impreso que expresa el contenido del comprobante electrónico. Se genera en PDF, legible, y se entrega en el mismo acto de la compraventa o prestación del servicio.',
    fuente: `(${D}, art. 2, inc. 24); (${R27}, art. 5)`,
  },
  {
    termino: 'Sin internet',
    definicion: 'Situación 3 de la clave. El comprobante se genera y se firma en el acto de la venta, pero, a falta de acceso a internet, se envía a Hacienda a más tardar dos días hábiles después de generado.',
    fuente: `(DGT, 2024a, nota 3, p. 68); (${D}, art. 21)`,
  },
  {
    termino: 'Situación del comprobante',
    definicion: 'Dígito 42 de la clave: 1 normal (generado y transmitido en el acto de la venta), 2 contingencia y 3 sin internet.',
    fuente: '(DGT, 2024a, nota 3, p. 68)',
  },
  {
    termino: 'Sustitución de un comprobante rechazado',
    definicion: 'Emisión de un comprobante nuevo que remite al rechazado con el código de referencia 16 y el tipo de documento 10 (comprobante rechazado por el Ministerio de Hacienda).',
    fuente: '(DGT, 2024a, notas 9 y 10)',
  },
  {
    termino: 'Tarifa del IVA',
    definicion: 'Código de la tarifa aplicada a la línea: 01 tarifa 0 % con derecho a crédito, 02 reducida 1 %, 03 reducida 2 %, 04 reducida 4 %, 08 general 13 %, 09 reducida 0,5 %, 10 exenta y 11 tarifa 0 % sin derecho a crédito, entre otras. La tarifa general del 13 % la fija el artículo 10 de la Ley del IVA.',
    fuente: '(DGT, 2024a, nota 8.1); (Asamblea Legislativa de la República de Costa Rica, 1982, arts. 10–11)',
  },
  {
    termino: 'Tipo de documento de referencia',
    definicion: 'Código del documento al que remite un comprobante: 01 factura electrónica, 02 nota de débito, 03 nota de crédito, 04 tiquete, 08 comprobante emitido en contingencia, 10 comprobante rechazado por Hacienda, 19 factura de exportación y 20 recibo electrónico de pago, entre otros.',
    fuente: '(DGT, 2024a, nota 10)',
  },
  {
    termino: 'Tipo de transacción',
    definicion: 'Código que distingue la venta normal (01) de los autoconsumos, las cuotas de afiliación, los bienes de capital y las entregas sin contraprestación a terceros.',
    fuente: '(DGT, 2024a, nota 22)',
  },
  {
    termino: 'Tiquete electrónico (TE)',
    definicion: 'Comprobante autorizado solo para operaciones con consumidores finales. No justifica gastos ni créditos tributarios y se entrega impreso al consumidor final.',
    fuente: `(${D}, art. 2, inc. 25)`,
  },
  {
    termino: 'TRIBU-CR',
    definicion: 'Plataforma tributaria del Ministerio de Hacienda que sustituyó a ATV desde el 6 de octubre de 2025. En ella se publican los Anexos y Estructuras (Oficina Virtual, OVi) y las actividades económicas se expresan en CIIU 4.',
    fuente: '(DGT, 2025b); (DGT, 2026)',
  },
  {
    termino: 'Validación de Hacienda',
    definicion: 'Revisión del XML en tres niveles sucesivos: 1) estructura vigente, 2) formato de los campos y 3) coincidencia con la base de datos de Hacienda. Si falla un nivel se rechaza; si pasa los tres, se acepta. Solo los comprobantes aceptados respaldan créditos fiscales y gastos deducibles.',
    fuente: `(DGT, 2024a, p. 17); (${R27}, art. 11)`,
  },
  {
    termino: 'Venta a crédito con IVA hasta 90 días',
    definicion: 'Condición de venta 10: venta a crédito de bienes o servicios gravados que cumple los artículos 3 inciso 8 y 27 de la Ley del IVA, cuyo impuesto puede pagarse de forma diferida. El pago se respalda con un REP (condición 11).',
    fuente: '(DGT, 2024a, nota 5); (Asamblea Legislativa de la República de Costa Rica, 1982, art. 27)',
  },
  {
    termino: 'Versión 4.4',
    definicion: 'Versión vigente de los Anexos y Estructuras. Su uso fue voluntario desde el 1 de abril de 2025 y obligatorio desde el 1 de septiembre de 2025, con prórroga excepcional hasta el 6 de octubre de 2025. La actualización con los nuevos códigos de referencia rige desde el 1 de noviembre de 2026.',
    fuente: '(DGT, 2025a); (DGT, 2025b, art. 21); (DGT, 2026)',
  },
];

export const SIGLAS: [string, string][] = [
  ['ATV', 'Administración Tributaria Virtual (plataforma anterior a TRIBU-CR)'],
  ['BCCR', 'Banco Central de Costa Rica'],
  ['CAByS', 'Catálogo de Bienes y Servicios'],
  ['CIIU', 'Clasificación Industrial Internacional Uniforme'],
  ['CNPT', 'Código de Normas y Procedimientos Tributarios (Ley N.° 4755)'],
  ['DGT', 'Dirección General de Tributación'],
  ['FE', 'Factura electrónica'],
  ['FEC', 'Factura electrónica de compra'],
  ['FEE', 'Factura electrónica de exportación'],
  ['IVA', 'Impuesto al valor agregado'],
  ['LIVA', 'Ley del Impuesto al Valor Agregado (Ley N.° 6826)'],
  ['MH', 'Ministerio de Hacienda'],
  ['NC', 'Nota de crédito electrónica'],
  ['ND', 'Nota de débito electrónica'],
  ['OVi', 'Oficina Virtual de TRIBU-CR'],
  ['PDF', 'Portable Document Format (formato de documento portátil)'],
  ['QR', 'Quick Response (código de respuesta rápida)'],
  ['REP', 'Recibo electrónico de pago'],
  ['RLIVA', 'Reglamento de la Ley del IVA (Decreto N.° 41779-H)'],
  ['RUT', 'Registro Único Tributario'],
  ['SINPE', 'Sistema Nacional de Pagos Electrónicos'],
  ['TE', 'Tiquete electrónico'],
  ['XAdES-EPES', 'XML Advanced Electronic Signatures – Explicit Policy-based Electronic Signature (formato de firma de los comprobantes)'],
  ['XML', 'Extensible Markup Language (lenguaje extensible de etiquetado)'],
];

/** Mismas entradas que la sección 4 de docs/MATRIZ_NORMATIVA.md; las letras del año son las de esta lista. */
export const REFERENCIAS: Referencia[] = [
  {
    texto: 'Asamblea Legislativa de la República de Costa Rica. (1964). *Código de Comercio* (Ley N.° 3284). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de',
    url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=6239&param2=151293&param3=1',
  },
  {
    texto: 'Asamblea Legislativa de la República de Costa Rica. (1971). *Código de Normas y Procedimientos Tributarios* (Ley N.° 4755). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de',
    url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=6530&param2=148766&param3=1',
  },
  {
    texto: 'Asamblea Legislativa de la República de Costa Rica. (1982). *Ley del Impuesto al Valor Agregado* (Ley N.° 6826). Sistema Costarricense de Información Jurídica. Recuperado el 23 de octubre de 2026, de',
    url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=32526&param2=150649&param3=1',
  },
  { texto: 'Banco Central de Costa Rica y Ministerio de Hacienda. (2025, 1 de abril). *Actualización del Catálogo de Bienes y Servicios (Cabys) 2025* (Comunicado CP-BCCR-015-2025) [Comunicado de prensa].' },
  {
    texto: 'Dirección General de Tributación. (2024a). *Anexos y estructuras para la emisión de comprobantes electrónicos* (Versión 4.4, con bitácora de ajustes al 22 de abril de 2026) [Documento técnico]. Ministerio de Hacienda. Oficina Virtual de TRIBU-CR.',
    url: 'https://ovitribucr.hacienda.go.cr/comprobantes-electronicos',
  },
  {
    texto: 'Dirección General de Tributación. (2024b, 13 de noviembre). *Resolución general sobre las disposiciones técnicas de los comprobantes electrónicos para efectos tributarios* (Resolución MH-DGT-RES-0027-2024; versión 3 de 3). Sistema Costarricense de Información Jurídica. Recuperado el 26 de octubre de 2026, de',
    url: 'https://sinalevi.go.cr/ResultadosNormativa/Informacion?param1=103276&param2=147532&param3=1',
  },
  { texto: 'Dirección General de Tributación. (2025a, 3 de febrero). *Modificación al Transitorio I de la resolución MH-DGT-RES-0027-2024* (Resolución MH-DGT-RES-0001-2025). *La Gaceta*, Alcance 20, N.° 29 (13 de febrero de 2025).' },
  { texto: 'Dirección General de Tributación. (2025b, 27 de agosto). *Modificaciones a las resoluciones generales que implementan las distintas funcionalidades y formularios dentro del Sistema Integrado de Gestión Tributaria denominado «TRIBU-CR»* (Resolución MH-DGT-RES-0043-2025). *La Gaceta*, Alcance 114, N.° 166.' },
  { texto: 'Dirección General de Tributación. (2026). *Actualización de los Anexos y Estructuras versión 4.4 y validación de comprobantes electrónicos* [Comunicado]. Ministerio de Hacienda.' },
  { texto: 'Dirección General de Tributación. (s. f.-a). *Código de forma farmacéutica* [Tabla, nota 19 de Anexos y Estructuras v4.4]. Ministerio de Hacienda. Oficina Virtual de TRIBU-CR.' },
  { texto: 'Dirección General de Tributación. (s. f.-b). *Codigodemoneda_V4.4* [Tabla, nota 13.1 de Anexos y Estructuras v4.4]. Ministerio de Hacienda. Oficina Virtual de TRIBU-CR.' },
  { texto: 'Instituto Geográfico Nacional y Registro Nacional. (2022). *Tabla por provincias, cantones y distritos de Costa Rica: División territorial administrativa 2022* (v3) [Tabla].' },
  { texto: 'Poder Ejecutivo de la República de Costa Rica. (2024, 2 de octubre). *Reglamento de comprobantes electrónicos para efectos tributarios* (Decreto Ejecutivo N.° 44739-H).' },
  { texto: 'Poder Ejecutivo de la República de Costa Rica. (2026, 29 de setiembre). *Adición al artículo 22 del Reglamento del Procedimiento Tributario, Decreto Ejecutivo N.° 38277-H del 07 de marzo de 2014* (Decreto Ejecutivo N.° 45953-H). *La Gaceta*, Alcance 139, N.° 196.' },
];

/** Minúsculas y sin tildes, para que «credito» encuentre «crédito». */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
