import { Copy, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alerta } from '../components/ui';
import { ENLACE_APP, Pasos, RECORDATORIOS } from '../components/Instrucciones';
import { useApp } from '../estado';

export function PrimerosPasos() {
  const { backend, avisar } = useApp();
  const [admin, setAdmin] = useState(false);

  // Las indicaciones para quien comparte la herramienta solo se muestran si el servidor confirma el rol.
  useEffect(() => {
    let vigente = true;
    backend.perfil().then(
      (p) => vigente && setAdmin(p.administrador),
      () => undefined,
    );
    return () => {
      vigente = false;
    };
  }, [backend]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ENLACE_APP);
      avisar('Enlace copiado.', 'ok');
    } catch {
      avisar('No se pudo copiar; seleccione el enlace y cópielo a mano.', 'err');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Primeros pasos</h1>
          <p>Instrucciones para participantes. Imprímalas o compártalas junto con el enlace.</p>
        </div>
        <div className="row no-print">
          <button className="btn" onClick={copiar}><Copy /> Copiar enlace</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer /> Imprimir o guardar PDF</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body stack">
          <div className="small muted">Enlace del simulador</div>
          <a className="enlace-app" href={ENLACE_APP}>{ENLACE_APP}</a>
          {backend.modo === 'local' && (
            <Alerta tipo="warn">
              Este sitio funciona en modo local: cada cuenta y sus datos quedan solo en el navegador donde se crearon.
            </Alerta>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Paso a paso</h2></div>
        <div className="card-body">
          <Pasos enlaces />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Tenga presente</h2></div>
        <div className="card-body">
          <ul className="recordatorios">
            {RECORDATORIOS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </div>

      {admin && (
        <div className="card no-print">
          <div className="card-head"><h2>Para quien comparte la herramienta</h2></div>
          <div className="card-body">
            <ul className="recordatorios">
              <li>Comparta el enlace de arriba; cada participante crea su propia cuenta.</li>
              {backend.modo === 'supabase' && (
                <li>Abra el simulador un día antes de cada sesión: en el plan gratuito, Supabase pausa el proyecto tras unos 7 días sin uso.</li>
              )}
              <li>Al terminar un curso, use Configuración › Limpieza de datos para borrar los datos de un participante o de todos.</li>
              <li>Si alguien olvida su contraseña, puede crear una cuenta nueva con otro correo.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
