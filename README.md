# Simulador de comprobantes electrónicos — Costa Rica (v4.4)

Aplicación educativa para practicar la emisión, recepción y validación de comprobantes electrónicos conforme a la **Resolución MH-DGT-RES-0027-2024**, los **Anexos y Estructuras v4.4**, el **Decreto 44739-H** y el **Decreto 45953-H** (SINPE Móvil en el RUT).

> ⚠️ **Entorno de simulación.** No se envía ningún comprobante al Ministerio de Hacienda. La firma XAdES-EPES y el envío real no están implementados y la pasarela real está bloqueada por diseño. Los documentos generados no tienen validez tributaria.

## Qué incluye

- Registro de **emisores** (actividades CIIU 4, sucursales, terminales, números SINPE), **receptores** (con exoneraciones) y **productos** vinculados al **CAByS 2025** completo (20 506 códigos).
- Emisión de **FE, TE, NC, ND, FEC, FEE y REP** con cálculo en vivo (descuentos, exoneraciones, impuesto asumido, otros cargos, IVA devuelto) y validaciones con su fuente normativa.
- **Clave numérica** de 50 dígitos, **consecutivo** de 20, **XML v4.4** según la condición de cada campo por tipo, y **representación gráfica PDF**.
- **Simulador de Hacienda**: validación en 3 niveles, estados (enviado, recibido, procesando, aceptado/rechazado), mensaje de respuesta y JSON del API.
- **Recepción** de comprobantes de proveedores y **mensajes de confirmación** 05/06/07 con plazo de 8 días hábiles.
- **Medios de pago** de la nota 6, incluido **SINPE Móvil**.
- Consultas con filtros, **reportes**, **auditoría** (bitácora inmutable) y **descargas** (XML, respuesta, PDF, CSV).
- 15 **escenarios de prueba** y la **matriz normativa** dentro de la app.

## Inicio rápido

```bash
npm install
npm run dev        # modo local: http://localhost:5173
```

Supabase (Auth, PostgreSQL con RLS, Realtime y función Edge) y publicación en GitHub Pages: ver [docs/INSTALACION.md](docs/INSTALACION.md).

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/MATRIZ_NORMATIVA.md](docs/MATRIZ_NORMATIVA.md) | Normas vigentes, reformas, contradicciones y referencias APA 7 |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Componentes, modelo de datos, separación de entornos y estructura del repositorio |
| [docs/INSTALACION.md](docs/INSTALACION.md) | Instalación, Supabase y GitHub Pages |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Pruebas automatizadas y escenarios |
| [docs/GUIA_USUARIO.md](docs/GUIA_USUARIO.md) | Uso paso a paso |

## Pruebas

```bash
npm test           # core + web + Supabase (PostgreSQL en PGlite, sin Docker)
npm run typecheck
```

## Licencia y responsabilidad

Material educativo. Verifique siempre la normativa vigente en SINALEVI y en el sitio del Ministerio de Hacienda antes de aplicarla.
