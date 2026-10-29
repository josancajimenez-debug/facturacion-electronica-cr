import { URLS_HACIENDA, motivosBloqueoEnvioReal } from '@fe-cr/core';
import { useCallback, useEffect, useState } from 'react';
import { borrarDatosLocales } from '../backend/local';
import { FRASE_LIMPIAR_TODO, type ResultadoLimpieza, type UsuarioResumen } from '../backend/tipos';
import { Alerta, Campo, Texto } from '../components/ui';
import { config } from '../config';
import { useApp } from '../estado';
import { borrarConfigContable } from '../lib/contabilidad';

const resumenLimpieza = (r: ResultadoLimpieza) =>
  `${r.emisoresEliminados} emisor(es) eliminado(s)${r.emisoresCompartidos ? `; se retiró al usuario de ${r.emisoresCompartidos} emisor(es) compartido(s)` : ''}. Las cuentas se conservan.`;

/**
 * Borra datos de práctica sin eliminar cuentas. Cualquier usuario limpia lo suyo; limpiar los datos de
 * otro usuario o de todos solo se muestra si el servidor confirma que la cuenta es de administrador.
 */
function Limpieza() {
  const { backend, usuario, emisores, avisar } = useApp();
  const [admin, setAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [elegido, setElegido] = useState('');
  const [frase, setFrase] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    try {
      setUsuarios(await backend.usuarios());
    } catch (e) {
      avisar((e as Error).message, 'err');
    }
  }, [backend, avisar]);

  useEffect(() => {
    let vivo = true;
    backend.perfil().then(
      (p) => {
        if (!vivo) return;
        setAdmin(p.administrador);
        if (p.administrador) void cargarUsuarios();
      },
      () => vivo && setAdmin(false),
    );
    return () => {
      vivo = false;
    };
  }, [backend, cargarUsuarios]);

  /** `contable`: emisores cuya configuración contable (apertura, ajustes, cierres) se borra de este navegador; `'todos'` la borra completa. */
  const limpiar = async (pregunta: string, accion: () => Promise<ResultadoLimpieza>, contable: string[] | 'todos' = []) => {
    if (!confirm(pregunta)) return;
    setOcupado(true);
    try {
      const resultado = await accion();
      borrarConfigContable(contable === 'todos' ? undefined : contable);
      avisar(`Listo: ${resumenLimpieza(resultado)}`, 'ok');
      setFrase('');
      if (admin) await cargarUsuarios();
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setOcupado(false);
    }
  };

  const persona = usuarios.find((u) => u.uid === elegido);
  return (
    <div className="card">
      <div className="card-head"><h2>Limpieza de datos</h2>{admin && <span className="badge info">Administrador</span>}</div>
      <div className="card-body stack">
        <p className="small muted" style={{ margin: 0 }}>
          Borra emisores, receptores, productos, comprobantes, recibidos y bitácora de práctica. Las cuentas de acceso se conservan: después puede volver a cargar los datos ficticios. No se puede deshacer.
        </p>
        <div className="stack">
          <strong>Mis datos</strong>
          <span className="small muted">Solo los datos de {usuario?.email}. Si comparte un emisor con otros usuarios, ese emisor se conserva para ellos y solo se le retira a usted.</span>
          <div>
            <button className="btn btn-danger" disabled={ocupado} onClick={() => limpiar(`¿Borrar todos sus datos de práctica (${usuario?.email})? Su cuenta se conserva.`, () => backend.limpiarMisDatos(), emisores.map((e) => e.id))}>
              Limpiar mis datos
            </button>
          </div>
        </div>
        {admin && (
          <>
            <div className="stack">
              <strong>Datos de un usuario</strong>
              <Campo etiqueta="Usuario">
                {(id) => (
                  <select id={id} value={elegido} onChange={(e) => setElegido(e.target.value)}>
                    <option value="">Seleccione un usuario</option>
                    {usuarios.map((u) => <option key={u.uid} value={u.uid}>{u.email} – {u.emisores} emisor(es)</option>)}
                  </select>
                )}
              </Campo>
              <div>
                <button className="btn btn-danger" disabled={ocupado || !persona} onClick={() => persona && limpiar(`¿Borrar los datos de práctica de ${persona.email}? Su cuenta se conserva.`, () => backend.limpiarUsuario(persona.uid))}>
                  Limpiar datos de este usuario
                </button>
              </div>
            </div>
            <div className="stack">
              <strong>Todos los usuarios</strong>
              <Texto etiqueta={`Escriba «${FRASE_LIMPIAR_TODO}» para confirmar`} valor={frase} onCambio={setFrase}
                ayuda={`Borra los datos de práctica de las ${usuarios.length} cuenta(s) registradas. Las cuentas se conservan.`} />
              <div>
                <button className="btn btn-danger" disabled={ocupado || frase !== FRASE_LIMPIAR_TODO} onClick={() => limpiar('¿Borrar los datos de práctica de TODOS los usuarios? No se puede deshacer.', () => backend.limpiarTodo(frase), 'todos')}>
                  Limpiar todo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
        <Limpieza />
        {backend.modo === 'local' && (
          <div className="card">
            <div className="card-head"><h2>Datos locales</h2></div>
            <div className="card-body stack">
              <p className="small muted" style={{ margin: 0 }}>En modo local todo se guarda en este navegador. A diferencia de «Limpiar todo», esta opción también elimina las cuentas creadas en este navegador.</p>
              <div><button className="btn btn-danger" onClick={() => { if (confirm('¿Borrar todos los datos locales, incluidas las cuentas?')) { borrarDatosLocales(); location.reload(); } }}>Borrar datos y cuentas locales</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
