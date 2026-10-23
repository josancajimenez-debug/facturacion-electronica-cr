# Arquitectura

## Visión general

```
┌───────────────────── apps/web (React + Vite) — GitHub Pages ─────────────────────┐
│ Páginas: Panel · Emitir · Comprobantes · Recepción · Emisor · Receptores ·        │
│ Productos · Reportes · Auditoría · Escenarios · Matriz normativa · Configuración  │
│                    │ interfaz Backend (backend/tipos.ts)                          │
│        ┌───────────┴──────────────┐                                               │
│   LocalBackend                SupabaseBackend                                     │
│   (localStorage,              (Auth + PostgREST con RLS + Realtime                │
│    core en el navegador)       + functions.invoke('api'))                         │
└────────┬──────────────────────────┬──────────────────────────────────────────────┘
         │                          │ HTTPS (JWT del usuario)
         │            ┌─────────────┴─────── Supabase ─────────────────────────────┐
         │            │ Función Edge "api" (Deno): emitir · sembrarDemo ·           │
         │            │ simularRecepcion · registrarRecibidoXml · confirmar          │
         │            │   └─ logica.ts (independiente del entorno) + core.js         │
         │            │ PostgreSQL: tablas, RLS, triggers de auditoría,             │
         │            │ siguiente_consecutivo() atómico, publicación Realtime       │
         │            └─────────────┬──────────────────────────────────────────────┘
         └──────────────┬───────────┘
              packages/core (TypeScript puro, sin dependencias de infraestructura)
   catalogos · ubicacion · tipos · fechas · clave · calculos · validaciones · xml
   emision · simulador · recepcion · entorno · datos-demo
```

## Decisiones

| Decisión | Motivo |
|---|---|
| **Un único paquete `core`** con toda la lógica tributaria | Se ejecuta igual en el navegador (modo local) y en la función Edge (Supabase). Se prueba una sola vez. |
| **Dos backends con la misma interfaz** | `local` permite practicar sin servicios externos; `supabase` aporta cuentas, base de datos compartida, tiempo real y operaciones seguras en servidor. |
| **Escrituras sensibles solo en el servidor** | La seguridad por fila (RLS) solo da permisos de lectura sobre comprobantes, recibidos y bitácora; los escribe la función Edge con la llave de servicio. Los contadores son inaccesibles para el cliente. |
| **Consecutivo atómico en PostgreSQL** | `siguiente_consecutivo()` usa `insert … on conflict do update … returning`; solo `service_role` puede ejecutarla. La función valida el borrador **antes** de pedir el número, de modo que un comprobante con errores no consume numeración. |
| **Auditoría por triggers** | Altas, cambios y bajas de emisores, receptores y productos se registran en la base de datos, con el correo del usuario del JWT, aunque los haga el cliente directamente. |
| **`logica.ts` separada del adaptador Deno** | Permite probar la función completa en Node contra PostgreSQL (PGlite) con el esquema real. `index.ts` solo autentica, aplica CORS e implementa el repositorio con supabase-js. |
| **`core` empaquetado para Deno** | `supabase/construir-edge.mjs` genera `functions/_shared/core.js` (esbuild) y la lista de códigos CAByS; `functions/api/deno.json` mapea `@fe-cr/core` a ese archivo. |
| **Sin envío real** | La función construye todo con ambiente `simulacion` y no contiene código que llame al API de Hacienda. |

## Modelo de datos (PostgreSQL)

| Tabla | Contenido | Cliente (RLS) | Función Edge |
|---|---|---|---|
| `emisores` | `datos` (Emisor), `propietario`, `miembros[]` | Leer/crear/modificar si es miembro; la membresía no se puede cambiar (trigger) | Crea emisores demo |
| `receptores`, `productos` | `datos` jsonb por emisor | Todo si es miembro; productos validados (CAByS 13 dígitos, precio > 0, tarifa) | Lee el padrón simulado |
| `comprobantes` | clave, tipo, estado, `datos` (Comprobante completo con XML e historial) | Solo lectura | Inserta y actualiza estados |
| `recibidos` | Comprobantes de proveedores y su confirmación | Solo lectura | Inserta y confirma |
| `bitacora` | Auditoría | Solo lectura | Inserta |
| `contadores` | Último número por emisor/sucursal/terminal/tipo | Sin acceso | Vía `siguiente_consecutivo()` |

Tiempo real: emisores, receptores, productos, comprobantes, recibidos y bitácora están en la publicación `supabase_realtime`; la web vuelve a consultar ante cada cambio.

## Estados de un comprobante

`generado → enviado → recibido → procesando → aceptado | rechazado`. Cada transición queda en `historial` y la respuesta final en la bitácora. En Supabase el procesamiento continúa después de responder gracias a `EdgeRuntime.waitUntil`.

## Estructura del repositorio

```
facturacion-electronica-cr/
├─ package.json                 workspaces y scripts
├─ packages/core/               lógica tributaria + pruebas
│  └─ src/datos/                división territorial y formas farmacéuticas (generados)
├─ apps/web/                    interfaz React (GitHub Pages)
│  ├─ public/data/cabys-2025.json
│  └─ src/{backend,components,lib,pages}/
├─ supabase/
│  ├─ config.toml               configuración del proyecto (Auth, URLs de redirección)
│  ├─ migrations/               esquema, RLS, triggers y funciones SQL
│  ├─ functions/api/            index.ts (Deno) · logica.ts · deno.json
│  ├─ construir-edge.mjs        genera functions/_shared/
│  └─ test/                     esquema y función sobre PGlite
├─ scripts/                     extracción de CAByS y catálogos
├─ docs/
└─ .github/workflows/           ci.yml · pages.yml · supabase.yml
```
