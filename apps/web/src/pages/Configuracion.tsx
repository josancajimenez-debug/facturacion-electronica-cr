import { URLS_HACIENDA, motivosBloqueoEnvioReal } from '@fe-cr/core';
import { useState } from 'react';
import { borrarDatosLocales } from '../backend/local';
import { Alerta, Texto } from '../components/ui';
import { config } from '../config';
import { useApp } from '../estado';

export function Configuracion() {
  const { backend, preferencias, guardarPreferencias, avisar } = useApp();
  const [feriados, setFeriados] = useState(preferencias.feriados.join(', '));
  const motivos = motivosBloqueoEnvioReal({ ambiente: config.ambiente, autorizacionExpresa: false, tieneCredencialesAtv: false, tieneLlaveCriptografica: false, firmaXadesImplementada: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Entorno, preferencias de la representación gráfica y plazos.</p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h2>Entorno</h2><span className="badge warn">SIMULACIÓN</span></div>
          <div className="card-body stack">
            <table className="small"><tbody>
              <tr><td>Backend</td><td>{backend.descripcion}</td></tr>
              <tr><td>Ambiente tributario</td><td>{config.ambiente}{config.ambienteSolicitado !== 'simulacion' && ` (se ignoró «${config.ambienteSolicitado}»)`}</td></tr>
              <tr><td>API real de recepción (referencia)</td><td className="mono quiebre">{URLS_HACIENDA.recepcionProduccion}</td></tr>
              <tr><td>Sandbox oficial (referencia)</td><td className="mono quiebre">{URLS_HACIENDA.recepcionSandbox}</td></tr>
            </tbody></table>
            <Alerta tipo="warn">
              <strong>El envío real está bloqueado.</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
            </Alerta>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Preferencias</h2></div>
          <div className="card-body stack">
            <label className="check">
              <input type="checkbox" checked={preferencias.incluirQr} onChange={(e) => guardarPreferencias({ ...preferencias, incluirQr: e.target.checked })} />
              Incluir código QR en la representación gráfica
            </label>
            <p className="small muted" style={{ margin: 0 }}>
              El Transitorio III de la RES-0027-2024 suspende el uso del QR hasta que la DGT lo comunique. Si lo activa, se dibuja en la esquina inferior derecha (2,5 × 2,5 cm mínimo, art. 5) con la clave numérica.
            </p>
            <Texto etiqueta="Feriados para plazos en días hábiles (AAAA-MM-DD, separados por coma)" valor={feriados} onCambio={setFeriados}
              ayuda="Se excluyen sábados y domingos. La bibliografía no fija el calendario de feriados: regístrelos según la legislación laboral vigente." />
            <div>
              <button className="btn" onClick={() => {
                const entradas = feriados.split(',').map((f) => f.trim()).filter(Boolean);
                const validas = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(new Date(`${f}T12:00:00Z`).getTime());
                const lista = [...new Set(entradas.filter(validas))].sort();
                const ignoradas = entradas.filter((f) => !validas(f));
                guardarPreferencias({ ...preferencias, feriados: lista });
                setFeriados(lista.join(', '));
                avisar(`${lista.length} feriado(s) guardados.${ignoradas.length ? ` Se ignoraron por formato inválido: ${ignoradas.join(', ')}.` : ''}`, ignoradas.length ? 'err' : 'ok');
              }}>Guardar feriados</button>
            </div>
          </div>
        </div>
        {backend.modo === 'local' && (
          <div className="card">
            <div className="card-head"><h2>Datos locales</h2></div>
            <div className="card-body stack">
              <p className="small muted" style={{ margin: 0 }}>En modo local todo se guarda en este navegador. Borrarlos elimina usuarios, emisores y comprobantes de práctica.</p>
              <div><button className="btn btn-danger" onClick={() => { if (confirm('¿Borrar todos los datos locales?')) { borrarDatosLocales(); location.reload(); } }}>Borrar datos locales</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
