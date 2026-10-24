import { ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alerta, Texto } from '../components/ui';
import { useApp } from '../estado';

export function Login() {
  const { backend } = useApp();
  const [modo, setModo] = useState<'ingresar' | 'registrar'>('ingresar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

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
          <p className="small muted" style={{ margin: 0, display: 'flex', gap: 6 }}>
            <ShieldAlert size={14} style={{ flex: 'none', marginTop: 3 }} />
            {backend.descripcion}
            {backend.modo === 'local' && ' La cuenta solo existe en este navegador.'}
          </p>
        </div>
      </div>
    </div>
  );
}
