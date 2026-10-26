import type { Comprobante, Emisor, Producto, Receptor } from '@fe-cr/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from './config';
import { LocalBackend } from './backend/local';
import { Cargando } from './components/ui';
import type { Backend, EntradaBitacora, Recibido, Usuario } from './backend/tipos';

let backendUnico: Promise<Backend> | null = null;

/** Una sola instancia por página: React (StrictMode) puede montar dos veces el proveedor. */
function crearBackend(): Promise<Backend> {
  backendUnico ??= config.backend === 'supabase'
    ? import('./backend/supabase').then(({ SupabaseBackend }) => new SupabaseBackend())
    : Promise.resolve(new LocalBackend());
  return backendUnico;
}

export interface Preferencias {
  feriados: string[];
  incluirQr: boolean;
}

const PREF_KEY = 'fe-cr:preferencias';
function leerPreferencias(): Preferencias {
  try {
    return { feriados: [], incluirQr: false, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') };
  } catch {
    return { feriados: [], incluirQr: false };
  }
}

interface Toast {
  id: number;
  texto: string;
  tipo: 'ok' | 'err' | 'info';
}

interface Contexto {
  backend: Backend;
  usuario: Usuario | null;
  cargandoAuth: boolean;
  /** false hasta recibir la primera lista de emisores (evita mostrar «Bienvenida» mientras carga). */
  emisoresListos: boolean;
  /** false hasta recibir la primera lista de comprobantes del emisor activo. */
  comprobantesListos: boolean;
  emisores: Emisor[];
  emisor: Emisor | null;
  seleccionarEmisor: (id: string) => void;
  receptores: Receptor[];
  productos: Producto[];
  comprobantes: Comprobante[];
  recibidos: Recibido[];
  bitacora: EntradaBitacora[];
  preferencias: Preferencias;
  guardarPreferencias: (p: Preferencias) => void;
  avisar: (texto: string, tipo?: Toast['tipo']) => void;
}

const Ctx = createContext<Contexto | null>(null);

export function useApp(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [errorInicio, setErrorInicio] = useState<string | null>(null);
  useEffect(() => {
    crearBackend().then(setBackend, (e) => setErrorInicio(String(e)));
  }, []);
  if (errorInicio) return <div className="content"><div className="alert err">No se pudo iniciar el backend: {errorInicio}</div></div>;
  if (!backend) return <Cargando />;
  return <ProveedorInterno backend={backend}>{children}</ProveedorInterno>;
}

function ProveedorInterno({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [emisores, setEmisores] = useState<Emisor[]>([]);
  const [emisorId, setEmisorId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('fe-cr:emisor-activo');
    } catch {
      return null;
    }
  });
  const [receptores, setReceptores] = useState<Receptor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [recibidos, setRecibidos] = useState<Recibido[]>([]);
  const [bitacora, setBitacora] = useState<EntradaBitacora[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencias>(leerPreferencias);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [emisoresListos, setEmisoresListos] = useState(false);
  const [comprobantesListos, setComprobantesListos] = useState(false);

  useEffect(
    () =>
      backend.onAuth((u) => {
        setUsuario(u);
        setCargandoAuth(false);
      }),
    [backend],
  );
  useEffect(() => {
    setEmisoresListos(false);
    return backend.onEmisores((lista) => {
      setEmisores(lista);
      setEmisoresListos(true);
    });
  }, [backend, usuario?.uid]);

  const emisor = useMemo(() => emisores.find((e) => e.id === emisorId) ?? emisores[0] ?? null, [emisores, emisorId]);
  const emisorActivoId = emisor?.id;

  useEffect(() => {
    setReceptores([]);
    setProductos([]);
    setComprobantes([]);
    setRecibidos([]);
    setBitacora([]);
    setComprobantesListos(false);
    if (!emisorActivoId) return;
    const subs = [
      backend.onReceptores(emisorActivoId, setReceptores),
      backend.onProductos(emisorActivoId, setProductos),
      backend.onComprobantes(emisorActivoId, (lista) => {
        setComprobantes(lista);
        setComprobantesListos(true);
      }),
      backend.onRecibidos(emisorActivoId, setRecibidos),
      backend.onBitacora(emisorActivoId, setBitacora),
    ];
    return () => subs.forEach((s) => s());
  }, [backend, emisorActivoId]);

  const seleccionarEmisor = useCallback((id: string) => {
    setEmisorId(id);
    try {
      localStorage.setItem('fe-cr:emisor-activo', id);
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const guardarPreferencias = useCallback((p: Preferencias) => {
    setPreferencias(p);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(p));
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const avisar = useCallback((texto: string, tipo: Toast['tipo'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-4), { id, texto, tipo }]);
    // Los errores permanecen más tiempo para que se alcancen a leer.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'err' ? 9000 : 5000);
  }, []);
  const cerrarToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const valor = useMemo<Contexto>(
    () => ({
      backend, usuario, cargandoAuth, emisoresListos, comprobantesListos, emisores, emisor, seleccionarEmisor,
      receptores, productos, comprobantes, recibidos, bitacora, preferencias, guardarPreferencias, avisar,
    }),
    [backend, usuario, cargandoAuth, emisoresListos, comprobantesListos, emisores, emisor, seleccionarEmisor,
      receptores, productos, comprobantes, recibidos, bitacora, preferencias, guardarPreferencias, avisar],
  );

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            <span>{t.texto}</span>
            <button className="toast-cerrar" onClick={() => cerrarToast(t.id)} aria-label="Cerrar aviso">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
