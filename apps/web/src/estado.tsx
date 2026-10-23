import type { Comprobante, Emisor, Producto, Receptor } from '@fe-cr/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from './config';
import { LocalBackend } from './backend/local';
import type { Backend, EntradaBitacora, Recibido, Usuario } from './backend/tipos';

async function crearBackend(): Promise<Backend> {
  if (config.backend === 'firebase') {
    const { FirebaseBackend } = await import('./backend/firebase');
    return new FirebaseBackend();
  }
  return new LocalBackend();
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
  if (!backend) return <div className="content muted">Cargando…</div>;
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

  useEffect(
    () =>
      backend.onAuth((u) => {
        setUsuario(u);
        setCargandoAuth(false);
      }),
    [backend],
  );
  useEffect(() => backend.onEmisores(setEmisores), [backend, usuario?.uid]);

  const emisor = useMemo(() => emisores.find((e) => e.id === emisorId) ?? emisores[0] ?? null, [emisores, emisorId]);

  useEffect(() => {
    if (!emisor) {
      setReceptores([]);
      setProductos([]);
      setComprobantes([]);
      setRecibidos([]);
      setBitacora([]);
      return;
    }
    const subs = [
      backend.onReceptores(emisor.id, setReceptores),
      backend.onProductos(emisor.id, setProductos),
      backend.onComprobantes(emisor.id, setComprobantes),
      backend.onRecibidos(emisor.id, setRecibidos),
      backend.onBitacora(emisor.id, setBitacora),
    ];
    return () => subs.forEach((s) => s());
  }, [backend, emisor?.id]);

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
    setToasts((t) => [...t, { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const valor: Contexto = {
    backend, usuario, cargandoAuth, emisores, emisor, seleccionarEmisor,
    receptores, productos, comprobantes, recibidos, bitacora, preferencias, guardarPreferencias, avisar,
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>{t.texto}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
