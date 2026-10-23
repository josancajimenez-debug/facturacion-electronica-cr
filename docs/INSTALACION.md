# Instalación y configuración

## Requisitos

| Herramienta | Versión probada | Para qué |
|---|---|---|
| Node.js | 24.18 (mínimo 20) | Todo |
| npm | 11 | Dependencias |
| Firebase CLI | 15.32 | Emuladores y despliegue (`npm i -g firebase-tools`) |
| Java (JRE) | 21 | Solo para el emulador de Firestore |
| Git | 2.55 | Control de versiones |

> **OneDrive:** el repositorio está dentro de una carpeta sincronizada. `node_modules` tiene miles de archivos; si la sincronización se vuelve lenta, mueva el proyecto fuera de OneDrive o excluya esa carpeta.

## 1. Modo local (sin Firebase)

```bash
npm install
npm run dev          # http://localhost:5173
```

Cree una cuenta (solo existe en ese navegador) y pulse **Cargar datos ficticios**.

El catálogo CAByS ya viene en `apps/web/public/data/cabys-2025.json`. Para regenerarlo desde la bibliografía:

```bash
npm run datos:cabys   # lee ../Bibliogafía/2025-04-01-catalogo-de-bienes-servicios-1.md
```

## 2. Modo Firebase con emuladores (recomendado para probar la arquitectura completa)

```bash
npm install
npm run dev:firebase          # compila Functions y levanta Auth, Firestore, Functions y la UI de emuladores (http://localhost:4000)
```

En otra terminal:

```bash
cd apps/web
cp .env.example .env.local    # en Windows: copy .env.example .env.local
# edite .env.local y ponga VITE_BACKEND=firebase
npm run dev
```

El proyecto `demo-fe-cr` es exclusivo de emuladores: no existe en la nube y no requiere credenciales.

## 3. Configuración de un proyecto Firebase real (opcional)

> Esto publica la aplicación en Internet. Sigue siendo un **simulador**: no envía nada a Hacienda.

1. Cree un proyecto en <https://console.firebase.google.com> y active:
   - **Authentication** → método *Correo electrónico/contraseña*.
   - **Firestore Database** (modo producción; las reglas del repositorio se publican en el paso 4).
   - Plan **Blaze**: Cloud Functions de 2.ª generación lo requiere.
2. Registre una app web en *Configuración del proyecto* y copie `apiKey`, `authDomain`, `projectId` y `appId`.
3. Configure el cliente en `apps/web/.env.production.local`:

   ```
   VITE_BACKEND=firebase
   VITE_USAR_EMULADORES=false
   VITE_FIREBASE_PROJECT_ID=su-proyecto
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=su-proyecto.firebaseapp.com
   VITE_FIREBASE_APP_ID=...
   ```

4. Publique:

   ```bash
   firebase login
   firebase use --add            # elija el proyecto y asígnele un alias
   npm run build
   firebase deploy --only firestore:rules,functions,hosting
   ```

5. **No** defina `APP_AMBIENTE=produccion`. Aunque se hiciera, la pasarela real rehúsa el envío (falta la firma XAdES-EPES y la autorización expresa).

## Variables de entorno

| Variable | Dónde | Valor por defecto | Descripción |
|---|---|---|---|
| `VITE_BACKEND` | web | `local` | `local` o `firebase` |
| `VITE_USAR_EMULADORES` | web | `true` | Conectar el SDK a los emuladores |
| `VITE_FIREBASE_*` | web | `demo-fe-cr` | Configuración del proyecto |
| `APP_AMBIENTE` | Functions | `simulacion` | Solo `simulacion` está soportado |
| `SIMULADOR_PAUSA_MS` | Functions | `1500` | Pausa entre estados simulados |

## GitHub

```bash
git remote add origin https://github.com/<usuario>/facturacion-electronica-cr.git
git push -u origin main
```

El flujo `.github/workflows/ci.yml` ejecuta verificación de tipos, pruebas y compilación en cada *push* y *pull request*.
