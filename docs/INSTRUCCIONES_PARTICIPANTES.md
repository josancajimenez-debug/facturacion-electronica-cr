# Primeros pasos — instrucciones para participantes

**Enlace del simulador:** <https://josancajimenez-debug.github.io/facturacion-electronica-cr/>

> Entorno de simulación: nada se envía al Ministerio de Hacienda y los documentos no tienen validez tributaria.

Estas mismas instrucciones están dentro de la herramienta: en la pantalla de ingreso (**Instrucciones para participantes**) y, con la sesión iniciada, en **Referencia › Primeros pasos**, donde se pueden imprimir o guardar en PDF.

## Paso a paso

1. **Cree su cuenta.** Abra el enlace y pulse «¿No tiene cuenta? Crear una». Use su correo y una contraseña de al menos 6 caracteres. Anótela: el simulador no envía correos para recuperarla.
2. **Cargue los datos de práctica.** En la Bienvenida pulse «Cargar datos ficticios». Se crea un emisor de práctica con actividades, sucursales, receptores y productos con códigos CAByS 2025. Si prefiere, use «Registrar mi propio emisor» con datos inventados.
3. **Conozca los registros.** Revise «Emisor y actividades», «Receptores» y «Productos y servicios». Ahí están los datos que luego se copian a cada comprobante.
4. **Emita su primera factura.** En «Emitir comprobante» elija Factura electrónica, seleccione un receptor y agregue un producto del catálogo. Indique el medio de pago y revise el resumen y las validaciones de la derecha. Cuando no haya errores, pulse «Emitir».
5. **Revise la respuesta de Hacienda (simulada).** En el detalle verá avanzar los estados hasta Aceptado o Rechazado. Revise las pestañas XML comprobante, Mensaje Hacienda y Representación gráfica, y descargue el XML y el PDF.
6. **Practique otros casos.** Desde un comprobante aceptado emita una nota de crédito o de débito. En «Recepción» simule un comprobante de proveedor y confírmelo (05 aceptación, 06 parcial, 07 rechazo). En «Escenarios de prueba» ejecute los casos listos y compare con el resultado esperado.
7. **Consulte la referencia.** Use el «Glosario» para los términos y códigos y la «Matriz normativa» para la fuente de cada regla.

## Tenga presente

- Sus datos son privados: cada cuenta ve solo sus propios emisores y comprobantes.
- Para empezar de cero use **Configuración › Limpieza de datos › Limpiar mis datos** y vuelva a cargar los datos ficticios.
- Funciona en cualquier navegador actualizado, en computadora o celular.

## Para quien comparte la herramienta

- Comparta el enlace; cada participante crea su propia cuenta (el registro está abierto y no pide confirmar el correo).
- Abra el simulador un día antes de cada sesión: en el plan gratuito, Supabase pausa el proyecto tras unos 7 días sin uso. Si está pausado, reactívelo desde el panel de Supabase.
- Al terminar un curso, el administrador (`ADMIN_EMAILS`) puede borrar los datos de un participante o de todos en **Configuración › Limpieza de datos**.
- Si alguien olvida su contraseña, puede crear una cuenta nueva con otro correo.

El texto de la app está en `apps/web/src/components/Instrucciones.tsx`; si cambia uno, actualice el otro.
