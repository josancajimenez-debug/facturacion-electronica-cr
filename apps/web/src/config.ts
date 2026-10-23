const env = import.meta.env;

const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

export const config = {
  // Supabase solo se activa si hay URL y llave pública; si no, la app funciona en modo local.
  backend: (env.VITE_BACKEND === 'supabase' && supabaseUrl && supabaseAnonKey ? 'supabase' : 'local') as 'local' | 'supabase',
  // Este cliente solo opera en simulación; cualquier otro valor se ignora deliberadamente.
  ambiente: 'simulacion' as const,
  ambienteSolicitado: env.VITE_APP_AMBIENTE ?? 'simulacion',
  supabase: { url: supabaseUrl, anonKey: supabaseAnonKey },
};
