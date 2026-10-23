# Instalación, Supabase y GitHub Pages

## Requisitos

| Herramienta | Versión probada | Para qué |
|---|---|---|
| Node.js | 24.18 (mínimo 20) | Todo |
| npm | 11 | Dependencias |
| Git | 2.55 | Control de versiones |
| Supabase CLI | vía `npx supabase@latest` | Desplegar base de datos y función Edge |

No se necesita Docker: las pruebas de base de datos usan PGlite (PostgreSQL en WebAssembly).

> **OneDrive:** el repositorio está en una carpeta sincronizada. `node_modules` tiene miles de archivos; si la sincronización se vuelve lenta, mueva el proyecto fuera de OneDrive o excluya esa carpeta.

## 1. Modo local (sin servicios externos)

```bash
npm install
npm run dev          # http://localhost:5173
```

Cree una cuenta (solo existe en ese navegador) y pulse **Cargar datos ficticios**.

Regenerar los catálogos desde las fuentes:

```bash
npm run datos:cabys      # lee ../Bibliogafía/2025-04-01-catalogo-de-bienes-servicios-1.md
npm run datos:catalogos  # División Territorial 2022 (bibliografía) + formas farmacéuticas (Ministerio de Salud, en línea)
```

## 2. Supabase

### 2.1 Crear el proyecto

1. Cree una cuenta en <https://supabase.com> y un proyecto nuevo (plan gratuito). Anote la **contraseña de la base de datos**.
2. En **Project Settings → API** copie la **Project URL**, la llave pública **anon / publishable** y el **Project ref** (identificador).

> La llave `service_role` es secreta: nunca la ponga en la web ni en el repositorio. La función Edge la recibe automáticamente de Supabase.

### 2.2 Desplegar desde su computadora

```bash
npx supabase@latest login                         # abre el navegador para autorizar la CLI
npx supabase@latest link --project-ref <REF>      # pide la contraseña de la base de datos
npm run supabase:desplegar                        # migraciones + función Edge "api"
npx supabase@latest config push                   # Auth: sin confirmación de correo y URL del sitio
```

### 2.3 O desplegar desde GitHub Actions

En **Settings → Secrets and variables → Actions** del repositorio:

- *Secrets*: `SUPABASE_ACCESS_TOKEN` (cree uno en <https://supabase.com/dashboard/account/tokens>) y `SUPABASE_DB_PASSWORD`.
- *Variables*: `SUPABASE_PROJECT_REF`.

Luego ejecute el flujo **Desplegar en Supabase** en la pestaña *Actions*.

### 2.4 Usar Supabase en desarrollo local

Cree `apps/web/.env.local` (no se versiona):

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<llave anon>
```

## 3. GitHub Pages

El flujo `.github/workflows/pages.yml` compila y publica la web en cada *push* a `main`.

1. En **Settings → Pages**, elija *Source: GitHub Actions*. En cuentas gratuitas, Pages requiere que el repositorio sea **público**.
2. Para que la versión publicada use Supabase, cree en **Settings → Secrets and variables → Actions → Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Sin esas variables, el sitio se publica en **modo local**.
3. La dirección será `https://<usuario>.github.io/facturacion-electronica-cr/`. Si cambia, actualice `site_url` en `supabase/config.toml` y ejecute `config push`.

## Variables

| Variable | Dónde | Descripción |
|---|---|---|
| `VITE_BACKEND` | web | `local` o `supabase` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | web / variables de Actions | Conexión pública al proyecto |
| `VITE_BASE` | flujo de Pages | Ruta base del sitio (`/<repositorio>/`) |
| `SIMULADOR_PAUSA_MS` | secreto de la función Edge (opcional) | Pausa entre estados simulados (1500 ms por defecto) |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | Actions | Despliegue automatizado |
