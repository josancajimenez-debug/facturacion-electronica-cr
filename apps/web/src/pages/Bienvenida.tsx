import { Building2, Database } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../estado';

export function Bienvenida() {
  const { backend, seleccionarEmisor, avisar } = useApp();
  const [cargando, setCargando] = useState(false);

  const sembrar = async () => {
    setCargando(true);
    try {
      const id = await backend.sembrarDemo();
      seleccionarEmisor(id);
      avisar('Datos ficticios de demostración cargados.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bienvenida</h1>
          <p>
            Para emitir comprobantes primero registre el obligado tributario emisor. ¿Primera vez? Siga los{' '}
            <Link to="/primeros-pasos">primeros pasos</Link>.
          </p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-body stack">
            <Database />
            <h2>Cargar datos de demostración</h2>
            <p className="muted" style={{ margin: 0 }}>
              Crea un emisor ficticio con actividades económicas (CIIU 4 de TRIBU-CR), sucursales, receptores y un catálogo de productos con códigos
              CAByS 2025 reales. Recomendado para practicar.
            </p>
            <button className="btn btn-primary" onClick={sembrar} disabled={cargando}>
              {cargando ? 'Cargando…' : 'Cargar datos ficticios'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack">
            <Building2 />
            <h2>Registrar mi propio emisor</h2>
            <p className="muted" style={{ margin: 0 }}>
              Ingrese identificación, ubicación, correos, actividades económicas, sucursales, terminales y números SINPE Móvil.
            </p>
            <Link className="btn" to="/emisor">
              Registrar emisor
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
