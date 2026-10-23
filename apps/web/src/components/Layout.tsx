import {
  BookOpen,
  Building2,
  ClipboardList,
  FilePlus2,
  FileText,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PieChart,
  Settings,
  ShieldAlert,
  SunMoon,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../estado';

const NAV = [
  { grupo: 'Operación' },
  { a: '/', texto: 'Panel', icono: LayoutDashboard },
  { a: '/emitir', texto: 'Emitir comprobante', icono: FilePlus2 },
  { a: '/comprobantes', texto: 'Comprobantes emitidos', icono: FileText },
  { a: '/recepcion', texto: 'Recepción', icono: Inbox },
  { grupo: 'Registros' },
  { a: '/emisor', texto: 'Emisor y actividades', icono: Building2 },
  { a: '/receptores', texto: 'Receptores', icono: Users },
  { a: '/productos', texto: 'Productos y servicios', icono: Package },
  { grupo: 'Control' },
  { a: '/reportes', texto: 'Reportes', icono: PieChart },
  { a: '/bitacora', texto: 'Auditoría', icono: ClipboardList },
  { a: '/escenarios', texto: 'Escenarios de prueba', icono: FlaskConical },
  { grupo: 'Referencia' },
  { a: '/normativa', texto: 'Matriz normativa', icono: BookOpen },
  { a: '/configuracion', texto: 'Configuración', icono: Settings },
] as const;

function useTema(): [string, () => void] {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('fe-cr:tema') ?? '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (tema) document.documentElement.dataset.theme = tema;
    else delete document.documentElement.dataset.theme;
  }, [tema]);
  const alternar = () => {
    const oscuro = tema ? tema === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nuevo = oscuro ? 'light' : 'dark';
    setTema(nuevo);
    try {
      localStorage.setItem('fe-cr:tema', nuevo);
    } catch {
      /* sin almacenamiento */
    }
  };
  return [tema, alternar];
}

export function Layout() {
  const { usuario, backend, emisores, emisor, seleccionarEmisor } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [, alternarTema] = useTema();
  const ubicacion = useLocation();
  useEffect(() => setAbierto(false), [ubicacion.pathname]);

  return (
    <div className="app">
      <aside className={`sidebar ${abierto ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="brand">
          <div className="brand-logo">FE</div>
          <div>
            <div className="brand-title">Simulador FE CR</div>
            <div className="brand-sub">Anexos y Estructuras v4.4</div>
          </div>
        </div>
        {NAV.map((n, i) =>
          'grupo' in n ? (
            <div key={i} className="nav-group">{n.grupo}</div>
          ) : (
            <NavLink key={n.a} to={n.a} end={n.a === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <n.icono aria-hidden />
              {n.texto}
            </NavLink>
          ),
        )}
        <div style={{ flex: 1 }} />
        <div className="small muted" style={{ padding: '12px 10px 0' }}>{backend.descripcion}</div>
      </aside>
      {abierto && <div className="modal-back" style={{ zIndex: 30 }} onClick={() => setAbierto(false)} />}
      <div className="main">
        <div className="sim-banner" role="note">
          <ShieldAlert size={16} aria-hidden />
          <strong>ENTORNO DE SIMULACIÓN</strong><span className="sim-detalle"> — Ningún comprobante se envía al Ministerio de Hacienda. Los documentos generados no tienen validez tributaria.</span>
        </div>
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu />
          </button>
          {emisores.length > 0 && (
            <select aria-label="Emisor activo" value={emisor?.id ?? ''} onChange={(e) => seleccionarEmisor(e.target.value)} style={{ maxWidth: 320 }}>
              {emisores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({e.identificacion.numero})
                </option>
              ))}
            </select>
          )}
          <div className="spacer" />
          <button className="btn btn-ghost btn-icon" onClick={alternarTema} aria-label="Cambiar tema claro/oscuro" title="Tema">
            <SunMoon />
          </button>
          <span className="small muted nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{usuario?.email}</span>
          <button className="btn btn-ghost btn-icon" onClick={() => backend.salir()} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
