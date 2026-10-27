import { ListChecks, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Pasos, RECORDATORIOS } from '../components/Instrucciones';
import { Alerta, Modal, Texto } from '../components/ui';
import { useApp } from '../estado';

export function Login() {
  const { backend } = useApp();
  const [modo, setModo] = useState<'ingresar' | 'registrar'>('ingresar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [instrucciones, setInstrucciones] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const correo = email.trim();
    try {
      if (modo === 'ingresar') await backend.ingresar(correo, clave);
      else await backend.registrar(correo, clave);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <div className="card">
        <div className="card-body stack">
          <div className="brand" style={{ padding: 0 }}>
            <div className="brand-logo">FE</div>
            <div>
              <div className="brand-title">Simulador de comprobantes electrónicos</div>
              <div className="brand-sub">Costa Rica · Anexos y Estructuras v4.4</div>
            </div>
          </div>
          <Alerta tipo="warn">
            <strong>Herramienta educativa.</strong> Todo el flujo con Hacienda es simulado; no se envían comprobantes reales.
          </Alerta>
          <form className="stack" onSubmit={enviar}>
            <Texto etiqueta="Correo electrónico" tipo="email" valor={email} onCambio={setEmail} requerido />
            <Texto etiqueta="Contraseña" tipo="password" valor={clave} onCambio={setClave} requerido ayuda={modo === 'registrar' ? 'Mínimo 6 caracteres.' : undefined} />
            {error && <Alerta tipo="err">{error}</Alerta>}
            <button className="btn btn-primary" disabled={enviando || !email.trim() || !clave}>
              {enviando ? 'Un momento…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
          <button className="btn btn-ghost" onClick={() => { setModo(modo === 'ingresar' ? 'registrar' : 'ingresar'); setError(''); }}>
            {modo === 'ingresar' ? '¿No tiene cuenta? Crear una' : 'Ya tengo cuenta'}
          </button>
          <button className="btn btn-ghost" onClick={() => setInstrucciones(true)}>
            <ListChecks /> Instrucciones para participantes
          </button>
          <p className="small muted" style={{ margin: 0, display: 'flex', gap: 6 }}>
            <ShieldAlert size={14} style={{ flex: 'none', marginTop: 3 }} />
            {backend.descripcion}
            {backend.modo === 'local' && ' La cuenta solo existe en este navegador.'}
          </p>
        </div>
      </div>
      {instrucciones && (
        <Modal titulo="Primeros pasos" onCerrar={() => setInstrucciones(false)} pie={<button className="btn btn-primary" onClick={() => setInstrucciones(false)}>Entendido</button>}>
          <Pasos />
          <ul className="recordatorios">
            {RECORDATORIOS.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="small muted" style={{ marginBottom: 0 }}>Con la sesión iniciada, estas instrucciones están en el menú Referencia › Primeros pasos.</p>
        </Modal>
      )}
    </div>
  );
}
