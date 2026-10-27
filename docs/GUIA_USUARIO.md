# Guía de usuario

> Todo lo que hace esta herramienta es **simulado**. Ningún documento se envía al Ministerio de Hacienda ni tiene validez tributaria. La franja naranja en la parte superior lo recuerda en todo momento.

## 1. Primer ingreso

1. Cree una cuenta con correo y contraseña.
2. Elija **Cargar datos ficticios** (recomendado) o **Registrar mi propio emisor**.

La hoja de **Primeros pasos** resume el recorrido para participantes nuevos. Está en la pantalla de ingreso (**Instrucciones para participantes**) y en **Referencia › Primeros pasos**, con botones para copiar el enlace e imprimir o guardar en PDF. Quien tiene rol de administrador ve además indicaciones para compartir la herramienta. Versión en texto: [INSTRUCCIONES_PARTICIPANTES.md](INSTRUCCIONES_PARTICIPANTES.md).

## 2. Emisor y actividades económicas

Menú **Emisor y actividades**.

- **Identificación**: tipo y número sin guiones (física 9 dígitos, jurídica 10, DIMEX 11-12, NITE 10). El botón **Consultar** lee el padrón público de Hacienda (`/fe/ae`) y trae las actividades inscritas.
- **Proveedor de sistemas**: cédula del proveedor del software; si es desarrollo propio, la del mismo emisor.
- **Actividades**: códigos CIIU 4 de TRIBU-CR (p. ej. `6920.0`). Marque la principal.
- **Sucursales y terminales**: `001` casa matriz; terminal `00001` si solo hay una. Forman los primeros 8 dígitos del consecutivo.
- **Números SINPE Móvil**: el Decreto 45953-H obliga a registrarlos en el RUT cuando se usan para cobrar.

## 3. Receptores y productos

- **Receptores**: nombre, identificación, correo, actividad económica y, si aplica, **exoneración** (tipo de documento, número, institución, tarifa exonerada y fecha). Las exoneraciones se aplican automáticamente a las líneas.
- **Productos y servicios**: busque el código en el **CAByS 2025** por palabra o número. El sistema sugiere la tarifa del IVA del catálogo; confírmela según su operación. Elija unidad de medida (nota 15) y precio sin IVA.

## 4. Emitir un comprobante

Menú **Emitir comprobante**.

1. Elija el tipo: Factura, Tiquete, Nota de crédito, Nota de débito, Factura de compra, Exportación o Recibo de pago.
2. **Encabezado**: sucursal, terminal, situación (normal, contingencia o sin internet), actividad económica, condición de venta (con plazo si es crédito) y moneda (con el botón *BCCR/Hacienda* obtiene el tipo de cambio de venta).
3. **Receptor** (o **vendedor** en la factura de compra): elíjalo de la lista o ingréselo manualmente. En el tiquete puede quedar como consumidor final.
4. **Detalle**: agregue productos del catálogo o líneas libres. En «Descuentos, exoneración y datos adicionales» puede registrar hasta 5 descuentos (nota 20), exoneración, tipo de transacción, partida arancelaria (exportación) y si es un servicio de salud.
5. **Otros cargos** (p. ej. impuesto de servicio 10 %), **medios de pago** (hasta 4; con varios, los montos deben sumar el total; use *Completar saldo en el último*) e **información de referencia** (obligatoria en NC, ND, FEC y REP).
6. A la derecha verá el **resumen** calculado y las **validaciones** con su fuente normativa. El botón **Emitir** solo se habilita sin errores.
7. Al emitir se asignan consecutivo y clave, se genera el XML v4.4 y se envía al simulador. En el detalle verá avanzar los estados: *Generado → Enviado → Recibido → Procesando → Aceptado/Rechazado*.

## 5. Detalle de un comprobante

- Pestañas: **Resumen**, **XML comprobante**, **Mensaje Hacienda** (respuesta simulada), **API (JSON)** y **Representación gráfica** (PDF).
- Descargas con los nombres de la Nota 3: `clave.xml`, `clave_respuesta.xml`, `clave.pdf`.
- **Clave numérica** desglosada y **trazabilidad** con fecha de cada estado.
- Acciones:
  - **Nota de crédito / débito** (comprobantes aceptados): abre el formulario con la referencia ya llena. Si la nota de crédito anula con el código 01, el detalle ofrece **Emitir sustituto (código 07)**.
  - **Anular por error material**: nota de crédito con el código 13. Una vez aceptada, el detalle del original y el de la nota ofrecen **Emitir sustituto (código 15)**.
  - **Emitir comprobante sustituto** (rechazados): un comprobante rechazado no tiene validez y **no** se anula con nota de crédito; se emite uno nuevo que lo referencia con el código 16.
  - **Registrar pago (REP)**: para facturas con condición 08 o 10; referencia la factura con el código 17.

### Actualización v4.4 obligatoria desde el 1/11/2026

- Hasta el 31/10/2026 la herramienta **advierte** lo que pasará a ser obligatorio; desde el 1/11/2026 lo **rechaza**: código 16 al sustituir un rechazado, código 17 en el REP, REP sin referencias a notas de débito o crédito (02/03), clave obligatoria al referenciar los tipos 17-20 y notas de crédito que superen lo facturado más las notas de débito.
- Las notas con los códigos 13 y 14 se reflejan en el **período del comprobante que modifican**; el detalle lo indica y **Reportes** las suma en ese mes. Las de 01, 02, 06 y 12 se reflejan en el mes de la nota.
- El simulador advierte si una nota de crédito o débito tiene otra moneda, otro tipo de cambio o CAByS que no están en el comprobante que ajusta.
- Se aceptan cédulas jurídicas de **10 caracteres alfanuméricos** (la clave puede contener letras) y teléfonos especiales como el **911**.
- **IVA devuelto** (servicios de salud al 4 % pagados con tarjeta): si todo se paga con tarjeta se devuelve el IVA completo; con varios medios de pago u otros productos, se aplica (monto con tarjeta / venta neta) × IVA de salud.
- **Moneda** y **forma farmacéutica** se eligen de las tablas oficiales de Hacienda (notas 13.1 y 19).

## 6. Recepción de comprobantes de proveedores

Menú **Recepción**.

- **Simular comprobante de proveedor** o **Cargar XML** recibido.
- **Confirmar**: aceptación total (05), parcial (06) o rechazo (07); condición del IVA (nota 18), actividad, impuesto a acreditar y gasto aplicable. En aceptación parcial o rechazo el motivo es obligatorio.
- La columna **Plazo** muestra el vencimiento: 8 días hábiles desde el primer día del mes siguiente. Si vence sin confirmar, se presume aceptado (cuando no hay beneficio fiscal).

## 7. Consultas, reportes y auditoría

- **Comprobantes emitidos**: filtros por cédula, número, tipo, estado, medio de pago, condición, tarifa de IVA, fechas y montos; exportación a CSV.
- **Reportes**: ventas por tarifa de IVA, cobros por medio de pago (SINPE destacado), totales por tipo, crédito fiscal de compras confirmadas y ajustes por error material imputados al período. Es material de apoyo; no reemplaza la declaración D-104.
- **Auditoría**: cada creación, modificación, emisión, respuesta, recepción y confirmación con fecha y usuario; exportable a CSV.

## 8. Escenarios de prueba

Quince casos listos para ejecutar con un clic, con el resultado esperado y la fuente normativa de cada uno.

## 9. Matriz normativa y glosario

- **Matriz normativa**: normas vigentes, su estado en SINALEVI y dónde se aplican en la herramienta.
- **Glosario**, con dos pestañas y la lista de referencias APA 7 al final. El buscador de cada pestaña no distingue tildes ni mayúsculas.
  - **Términos y siglas**: 55 términos y 24 siglas definidos según la normativa, cada uno con su fuente.
  - **Códigos por paso del proceso**: los 21 catálogos del Anexo (679 códigos) que usa el simulador, agrupados en cinco pasos: identificar el comprobante, pactar la venta, describir cada línea, referenciar o corregir, y confirmar lo recibido. Cada catálogo explica para qué sirve y cada código muestra su significado y sus restricciones de uso (por ejemplo, «Solo en Recibo Electrónico de Pago»). Monedas, unidades de medida y formas farmacéuticas empiezan plegadas.

## 10. Configuración

- **Código QR** en el PDF: desactivado por defecto porque el Transitorio III de la RES-0027 lo suspende.
- **Feriados**: agréguelos para que el plazo de confirmación excluya esos días.
- **Limpieza de datos**: borra emisores, receptores, productos, comprobantes, recibidos y bitácora de práctica. Las cuentas de acceso se conservan, de modo que se puede volver a cargar los datos ficticios. No se puede deshacer.
  - **Limpiar mis datos**: disponible para todos; borra solo lo del usuario que tiene la sesión. Un emisor compartido con otros usuarios se conserva para ellos y solo se le retira a quien limpia.
  - **Limpiar datos de este usuario** y **Limpiar todo**: solo para el administrador (los correos de la variable `ADMIN_EMAILS`, que el servidor verifica). «Limpiar todo» exige escribir «LIMPIAR TODO». En modo local, cualquier usuario del navegador tiene estas opciones.
- **Borrar datos y cuentas locales** (solo en modo local): además de los datos, elimina las cuentas creadas en ese navegador.

## Preguntas frecuentes

- **¿Por qué no hay firma digital?** La firma XAdES-EPES requiere un certificado real; en simulación el XML incluye un comentario en su lugar.
- **¿Puedo usar esto para facturar?** No. Use un sistema autorizado o el facturador del Ministerio de Hacienda.
- **¿El consecutivo se pierde si hay errores?** No: solo se consume cuando el comprobante pasa las validaciones.
