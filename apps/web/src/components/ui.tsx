import type { Codigo, Validacion } from '@fe-cr/core';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Component, useEffect, useId, useRef, type ReactNode } from 'react';
import { ETIQUETA_ESTADO } from '../lib/formato';

export function Campo({ etiqueta, ayuda, error, children }: { etiqueta: string; ayuda?: ReactNode; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta}</label>
      {children(id)}
      {ayuda && <span className="hint">{ayuda}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function Texto(props: { etiqueta: string; valor: string | number | undefined; onCambio: (v: string) => void; ayuda?: ReactNode; tipo?: string; placeholder?: string; requerido?: boolean; max?: number; paso?: string; deshabilitado?: boolean }) {
  return (
    <Campo etiqueta={props.etiqueta + (props.requerido ? ' *' : '')} ayuda={props.ayuda}>
      {(id) => (
        <input
          id={id}
          type={props.tipo ?? 'text'}
          value={props.valor ?? ''}
          placeholder={props.placeholder}
          maxLength={props.max}
          step={props.paso}
          disabled={props.deshabilitado}
          onChange={(e) => props.onCambio(e.target.value)}
        />
      )}
    </Campo>
  );
}

export function Selector(props: { etiqueta: string; valor: string | undefined; onCambio: (v: string) => void; opciones: Codigo[] | { codigo: string; descripcion: string }[]; vacio?: string; ayuda?: ReactNode; requerido?: boolean; mostrarCodigo?: boolean; deshabilitado?: boolean }) {
  return (
    <Campo etiqueta={props.etiqueta + (props.requerido ? ' *' : '')} ayuda={props.ayuda}>
      {(id) => (
        <select id={id} value={props.valor ?? ''} disabled={props.deshabilitado} onChange={(e) => props.onCambio(e.target.value)}>
          {props.vacio !== undefined && <option value="">{props.vacio}</option>}
          {props.opciones.map((o) => (
            <option key={o.codigo} value={o.codigo}>
              {props.mostrarCodigo === false ? o.descripcion : `${o.codigo} – ${o.descripcion}`}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

export function Estado({ estado }: { estado: string }) {
  const e = ETIQUETA_ESTADO[estado] ?? { texto: estado, clase: '' };
  return <span className={`badge ${e.clase}`}>{e.texto}</span>;
}

export function Alerta({ tipo = 'info', children }: { tipo?: 'info' | 'ok' | 'warn' | 'err'; children: ReactNode }) {
  const Icono = { info: Info, ok: CheckCircle2, warn: AlertTriangle, err: XCircle }[tipo];
  return (
    <div className={`alert ${tipo}`} role={tipo === 'err' ? 'alert' : undefined}>
      <Icono aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function ListaValidaciones({ validaciones }: { validaciones: Validacion[] }) {
  if (validaciones.length === 0) return <Alerta tipo="ok">Sin errores de validación.</Alerta>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {validaciones.map((v, i) => (
        <Alerta key={i} tipo={v.nivel === 'error' ? 'err' : 'warn'}>
          {v.mensaje}
          {v.fuente && <span className="src">Fuente: {v.fuente}</span>}
        </Alerta>
      ))}
    </div>
  );
}

export function Modal({ titulo, onCerrar, children, pie }: { titulo: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  // Escape cierra; el foco entra al diálogo y vuelve al elemento que lo abrió.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar.current();
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      previo?.focus?.();
    };
  }, []);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onCerrar} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {pie && <div className="modal-foot">{pie}</div>}
      </div>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      {texto}
    </div>
  );
}

export function Vacio({ icono, titulo, children }: { icono: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icono}
      <h3 style={{ marginTop: 8 }}>{titulo}</h3>
      {children && <div style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );
}

/** Error al descargar una página diferida: suele indicar que se publicó una versión nueva del sitio. */
const esErrorDeCarga = (e: Error) => /dynamically imported module|Importing a module script failed|Loading chunk|module script/i.test(e.message);
const CLAVE_RECARGA = 'fe-cr:recarga-por-version';

/**
 * Atrapa errores al dibujar una página para que no quede la pantalla en blanco. Si la falla es porque el
 * navegador pide archivos de una versión anterior (tras publicar una nueva), recarga una sola vez.
 */
export class LimiteErrores extends Component<{ children: ReactNode; pantallaCompleta?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!esErrorDeCarga(error)) return;
    try {
      // Una recarga por minuto como máximo: si el archivo de verdad no existe, no se entra en un ciclo.
      const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA) ?? 0);
      if (Date.now() - ultima < 60_000) return;
      sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
    } catch {
      return;
    }
    location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const carga = esErrorDeCarga(error);
    const aviso = (
      <Alerta tipo="err">
        <strong>{carga ? 'No se pudo cargar esta página.' : 'Ocurrió un error al mostrar esta página.'}</strong>{' '}
        {carga ? 'Es posible que se haya publicado una versión nueva o que no haya conexión.' : error.message}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-sm" onClick={() => (carga ? location.reload() : this.setState({ error: null }))}>Reintentar</button>
        </div>
      </Alerta>
    );
    return this.props.pantallaCompleta ? <div className="content">{aviso}</div> : aviso;
  }
}

/** Resaltado ligero de sintaxis XML (etiquetas y comentarios). */
export function VisorXml({ xml }: { xml: string }) {
  const partes = xml.split(/(<!--[\s\S]*?-->|<[^>]+>)/g);
  return (
    <pre className="xml" tabIndex={0} aria-label="Contenido XML">
      {partes.map((p, i) =>
        p.startsWith('<!--') ? (
          <span key={i} className="c">{p}</span>
        ) : p.startsWith('<') ? (
          <span key={i} className="t">{p}</span>
        ) : (
          p
        ),
      )}
    </pre>
  );
}
