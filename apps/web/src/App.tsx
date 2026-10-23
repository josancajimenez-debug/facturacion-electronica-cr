import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useApp } from './estado';
import { Bienvenida } from './pages/Bienvenida';
import { Bitacora } from './pages/Bitacora';
import { Comprobantes } from './pages/Comprobantes';
import { Configuracion } from './pages/Configuracion';
import { Dashboard } from './pages/Dashboard';
import { DetalleComprobante } from './pages/DetalleComprobante';
import { EmisorPagina } from './pages/Emisor';
import { Escenarios } from './pages/Escenarios';
import { Login } from './pages/Login';
import { NuevoComprobante } from './pages/NuevoComprobante';
import { Normativa } from './pages/Normativa';
import { Productos } from './pages/Productos';
import { Receptores } from './pages/Receptores';
import { Recepcion } from './pages/Recepcion';
import { Reportes } from './pages/Reportes';

export function App() {
  const { usuario, cargandoAuth, emisores } = useApp();
  if (cargandoAuth) return <div className="content muted">Cargando…</div>;
  if (!usuario) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          {emisores.length === 0 ? (
            <>
              <Route path="/emisor" element={<EmisorPagina />} />
              <Route path="/normativa" element={<Normativa />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="*" element={<Bienvenida />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/emitir" element={<NuevoComprobante />} />
              <Route path="/comprobantes" element={<Comprobantes />} />
              <Route path="/comprobantes/:clave" element={<DetalleComprobante />} />
              <Route path="/recepcion" element={<Recepcion />} />
              <Route path="/emisor" element={<EmisorPagina />} />
              <Route path="/receptores" element={<Receptores />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/bitacora" element={<Bitacora />} />
              <Route path="/escenarios" element={<Escenarios />} />
              <Route path="/normativa" element={<Normativa />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
