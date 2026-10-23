const env = import.meta.env;

export const config = {
  backend: (env.VITE_BACKEND === 'firebase' ? 'firebase' : 'local') as 'local' | 'firebase',
  // Este cliente solo opera en simulación; cualquier otro valor se ignora deliberadamente.
  ambiente: 'simulacion' as const,
  ambienteSolicitado: env.VITE_APP_AMBIENTE ?? 'simulacion',
  usarEmuladores: env.VITE_USAR_EMULADORES !== 'false',
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo-fe-cr.firebaseapp.com',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'demo-fe-cr',
    appId: env.VITE_FIREBASE_APP_ID || undefined,
  },
};
