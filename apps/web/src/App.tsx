import { lazy, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Cargando } from './components/ui';
import { useApp } from './estado';
import { Login } from './pages/Login';

/** Carga diferida de cada página: el paquete inicial solo incluye el armazón y la pantalla de ingreso. */
const pagina = <K extends string>(cargar: () => Promise<Record<K, ComponentType>>, nombre: K) =>
  lazy(() => cargar().then((m) => ({ default: m[nombre] })));

const Bienvenida = pagina(() => import('./pages/Bienvenida'), 'Bienvenida');
const CatalogoCuentas = pagina(() => import('./pages/CatalogoCuentas'), 'CatalogoCuentas');
const BalanceApertura = pagina(() => import('./pages/BalanceApertura'), 'BalanceApertura');
const TransicionNiif = pagina(() => import('./pages/TransicionNiif'), 'TransicionNiif');
const AjustesCierre = pagina(() => import('./pages/AjustesCierre'), 'AjustesCierre');
const EstadosFinancieros = pagina(() => import('./pages/EstadosFinancieros'), 'EstadosFinancieros');
const LibroDiario = pagina(() => import('./pages/LibroDiario'), 'LibroDiario');
const LibroMayor = pagina(() => import('./pages/LibroMayor'), 'LibroMayor');
const Bitacora = pagina(() => import('./pages/Bitacora'), 'Bitacora');
const Comprobantes = pagina(() => import('./pages/Comprobantes'), 'Comprobantes');
const Configuracion = pagina(() => import('./pages/Configuracion'), 'Configuracion');
const Dashboard = pagina(() => import('./pages/Dashboard'), 'Dashboard');
const DetalleComprobante = pagina(() => import('./pages/DetalleComprobante'), 'DetalleComprobante');
const EmisorPagina = pagina(() => import('./pages/Emisor'), 'EmisorPagina');
const Escenarios = pagina(() => import('./pages/Escenarios'), 'Escenarios');
const Glosario = pagina(() => import('./pages/Glosario'), 'Glosario');
const NuevoComprobante = pagina(() => import('./pages/NuevoComprobante'), 'NuevoComprobante');
const Normativa = pagina(() => import('./pages/Normativa'), 'Normativa');
const PrimerosPasos = pagina(() => import('./pages/PrimerosPasos'), 'PrimerosPasos');
const Productos = pagina(() => import('./pages/Productos'), 'Productos');
const Receptores = pagina(() => import('./pages/Receptores'), 'Receptores');
const Proveedores = pagina(() => import('./pages/Proveedores'), 'Proveedores');
const Recepcion = pagina(() => import('./pages/Recepcion'), 'Recepcion');
const Reportes = pagina(() => import('./pages/Reportes'), 'Reportes');

export function App() {
  const { usuario, cargandoAuth, emisores, emisoresListos } = useApp();
  if (cargandoAuth) return <Cargando />;
  if (!usuario) return <Login />;
  // Mientras llega la lista de emisores no se decide entre «Bienvenida» y el panel: así no se ofrece
  // cargar datos demo (y duplicar el emisor) a quien ya tiene uno.
  if (!emisoresListos) return <Cargando />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          {emisores.length === 0 ? (
            <>
              <Route path="/emisor" element={<EmisorPagina />} />
              <Route path="/primeros-pasos" element={<PrimerosPasos />} />
              <Route path="/normativa" element={<Normativa />} />
              <Route path="/glosario" element={<Glosario />} />
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
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/contabilidad/catalogo" element={<CatalogoCuentas />} />
              <Route path="/contabilidad/apertura" element={<BalanceApertura />} />
              <Route path="/contabilidad/transicion" element={<TransicionNiif />} />
              <Route path="/contabilidad/diario" element={<LibroDiario />} />
              <Route path="/contabilidad/mayor" element={<LibroMayor />} />
              <Route path="/contabilidad/ajustes-cierre" element={<AjustesCierre />} />
              <Route path="/contabilidad/estados-financieros" element={<EstadosFinancieros />} />
              <Route path="/contabilidad/inventarios-balances" element={<Navigate to="/contabilidad/estados-financieros" replace />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/bitacora" element={<Bitacora />} />
              <Route path="/escenarios" element={<Escenarios />} />
              <Route path="/primeros-pasos" element={<PrimerosPasos />} />
              <Route path="/normativa" element={<Normativa />} />
              <Route path="/glosario" element={<Glosario />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
