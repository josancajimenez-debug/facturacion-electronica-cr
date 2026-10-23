# Arquitectura

## Visión general

```
┌──────────────────────────── apps/web (React + Vite) ────────────────────────────┐
│ Páginas: Panel · Emitir · Comprobantes · Recepción · Emisor · Receptores ·       │
│ Productos · Reportes · Auditoría · Escenarios · Matriz normativa · Configuración │
│                     │ interfaz Backend (backend/tipos.ts)                        │
│        ┌────────────┴─────────────┐                                              │
│   LocalBackend               FirebaseBackend                                     │
│   (localStorage,             (Auth + Firestore onSnapshot                        │
│    core en el navegador)      + Cloud Functions)                                 │
└────────┬───────────────────────────┬────────────────────────────────────────────┘
         │                           │ httpsCallable / onSnapshot
         │                 ┌─────────┴──────── functions/ (Node 22, 2.ª gen.) ───┐
         │                 │ emitirComprobante · procesarEnvio (trigger)          │
         │                 │ simularRecepcionProveedor · registrarRecibidoXml     │
         │                 │ confirmarRecibido · sembrarDatosDemo                 │
         │                 │ obtenerTipoCambio · auditar* (triggers)              │
         │                 │ pasarela-real.ts (BLOQUEADA)                         │
         │                 └─────────┬────────────────────────────────────────────┘
         └──────────────┬────────────┘
              packages/core (TypeScript puro, sin dependencias de Firebase)
   catalogos · tipos · fechas · clave · calculos · validaciones · xml · emision
   simulador · recepcion · entorno · datos-demo
```

## Decisiones

| Decisión | Motivo |
|---|---|
| **Un único paquete `core`** con toda la lógica tributaria | La misma función calcula, valida y genera el XML en el navegador (modo local) y en Cloud Functions (modo Firebase). Se prueba una sola vez (46 pruebas). |
| **Dos backends con la misma interfaz** | `local` permite practicar sin instalar nada más; `firebase` cumple el requisito de Auth, Firestore, Functions y Hosting con operaciones seguras. |
| **Escrituras sensibles solo desde Functions** | Las reglas de Firestore niegan al cliente escribir comprobantes, recibidos, contadores y bitácora. Así el consecutivo es atómico (transacción), la clave no se puede alterar y la trazabilidad es confiable. |
| **El consecutivo se consume solo si el comprobante es válido** | La validación ocurre dentro de la transacción; si falla, la transacción se aborta (Decreto 44739-H art. 13 inc. 4: sin saltos). |
| **`decimal.js` y redondeo «mitad hacia arriba» a 5 decimales** | Regla de redondeo del Anexo 1 y campos Decimal(18,5). |
| **Matriz de condición por tipo en el generador XML** | Cada campo lleva la cadena de condiciones del Anexo (FE, FEE, FEC, TE, NC, ND, REP); los campos «4 = inexistente» no se emiten. |
| **Proyecto `demo-fe-cr`** | Los proyectos con prefijo `demo-` solo funcionan con emuladores: es imposible tocar recursos reales por error. |
| **Pasarela real bloqueada** | `motivosBloqueoEnvioReal` exige ambiente de producción, autorización expresa, credenciales, llave criptográfica y firma XAdES; esta última no está implementada, así que el envío real nunca ocurre. |

## Separación de entornos

1. El cliente web fija `ambiente = 'simulacion'` e ignora cualquier otro valor.
2. Functions toma `APP_AMBIENTE`; por defecto `simulacion`. Si alguien la cambia a `produccion`, el trigger llama a la pasarela real, que se niega y deja el comprobante en estado `error` con los motivos en la bitácora.
3. Todo XML generado lleva el comentario «ENTORNO DE SIMULACIÓN, sin validez tributaria»; la respuesta simulada y el PDF también lo indican.
4. Las URL reales de Hacienda (Anexo 3) solo aparecen como referencia en `core/entorno.ts`.

## Modelo de datos (Firestore)

```
usuarios/{uid}                         { emisorActivo }
parametros/tipoCambioUSD               caché del tipo de cambio (escribe Functions)
emisores/{emisorId}                    Emisor + propietarioUid + miembros[]
  ├─ receptores/{id}                   escribe el cliente (validado por reglas) → auditado
  ├─ productos/{id}                    escribe el cliente (CAByS 13 dígitos, precio > 0) → auditado
  ├─ comprobantes/{clave}              solo Functions: XML, cálculos, estado, historial, respuesta
  ├─ recibidos/{clave}                 solo Functions: comprobantes de proveedores y confirmaciones
  ├─ contadores/{emisor_suc_term_tipo} solo Functions: último número
  └─ bitacora/{id}                     solo Functions: auditoría inmutable
```

## Estados de un comprobante

`generado → enviado → recibido → procesando → aceptado | rechazado` (y `error` si el envío real está bloqueado). Cada transición queda en `historial` con fecha y detalle, y en la bitácora.

## Estructura del repositorio

```
facturacion-electronica-cr/
├─ package.json                 workspaces y scripts
├─ firebase.json · .firebaserc  Hosting, Functions, Firestore y emuladores (proyecto demo-fe-cr)
├─ firestore.rules · firestore.indexes.json
├─ packages/core/               lógica tributaria + pruebas (vitest)
│  ├─ src/{catalogos,tipos,fechas,clave,calculos,validaciones,xml,emision,simulador,recepcion,entorno,datos-demo}.ts
│  └─ test/
├─ functions/                   Cloud Functions; build.mjs empaqueta en functions/deploy/
│  ├─ src/{index,pasarela-real}.ts
│  └─ test/{reglas,integracion}.test.ts
├─ apps/web/                    interfaz React
│  ├─ public/data/cabys-2025.json  (generado por scripts/extraer-cabys.mjs)
│  └─ src/{backend,components,lib,pages}/
├─ scripts/extraer-cabys.mjs
├─ docs/                        esta documentación
└─ .github/workflows/ci.yml
```
