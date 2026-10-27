import { REGEX_CORREO, TIPO_IDENTIFICACION, validarIdentificacion, type Emisor } from '@fe-cr/core';
import { UbicacionCampos } from '../components/UbicacionCampos';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Alerta, Selector, Texto } from '../components/ui';
import { useApp } from '../estado';
import { limpiarIdentificacion } from '../lib/formato';

/**
 * Terminales escritas como «00001, 00002». Mientras se escribe se conserva el elemento vacío tras la
 * última coma: si se descartara, el campo borraría la coma y no se podría agregar otra terminal.
 */
const separarTerminales = (texto: string): string[] => (texto.trim() ? texto.split(',').map((t) => t.trim()) : []);

const nuevoEmisor = (): Emisor => ({
  id: '',
  nombre: '',
  identificacion: { tipo: '02', numero: '' },
  ubicacion: { provincia: '1', canton: '01', distrito: '01', otrasSenas: '' },
  correos: [''],
  actividades: [],
  sucursales: [{ codigo: '001', nombre: 'Casa matriz', terminales: ['00001'] }],
  proveedorSistemas: '',
  telefonosSinpe: [],
  condicion: 'emisor-receptor',
});

export function EmisorPagina() {
  const { emisor, backend, avisar, seleccionarEmisor } = useApp();
  const [form, setForm] = useState<Emisor>(() => emisor ?? nuevoEmisor());
  const [creando, setCreando] = useState(!emisor);
  const [consultando, setConsultando] = useState(false);
  // Solo se recarga el formulario al cambiar de emisor: cada guardado del backend entrega una copia
  // nueva del mismo emisor y, si dependiera del objeto, borraría lo que el usuario está editando.
  useEffect(() => {
    if (emisor && !creando) setForm(emisor);
  }, [emisor?.id, creando]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p: Partial<Emisor>) => setForm((f) => ({ ...f, ...p }));
  const errores: string[] = [];
  if (form.nombre.trim().length < 5) errores.push('El nombre debe tener al menos 5 caracteres.');
  const eId = validarIdentificacion(form.identificacion);
  if (eId) errores.push(eId);
  if (['05', '06'].includes(form.identificacion.tipo)) errores.push('Un emisor debe identificarse con cédula física, jurídica, DIMEX o NITE.');
  if (form.correos.filter(Boolean).length === 0) errores.push('Registre al menos un correo.');
  form.correos.filter(Boolean).forEach((c) => !REGEX_CORREO.test(c) && errores.push(`Correo inválido: ${c}`));
  if (form.actividades.length === 0) errores.push('Registre al menos una actividad económica.');
  form.actividades.forEach((a, i) => {
    if (!a.codigo.trim()) errores.push(`Actividad ${i + 1}: indique el código.`);
    if (!a.descripcion.trim()) errores.push(`Actividad ${i + 1}: indique la descripción.`);
  });
  const repetidas = (lista: string[]) => [...new Set(lista.filter((x, i) => x && lista.indexOf(x) !== i))];
  repetidas(form.actividades.map((a) => a.codigo.trim())).forEach((c) => errores.push(`La actividad ${c} está repetida.`));
  if (!form.proveedorSistemas) errores.push('Indique el proveedor de sistemas (su propia identificación si es desarrollo propio).');
  // Anexo actualizado al 22/04/2026: mínimo 8 y máximo 20 dígitos, excepto números especiales como el 911.
  if (form.telefono && !/^(\d{8,20}|\d{3,4})$/.test(form.telefono.numero)) errores.push('El teléfono debe tener entre 8 y 20 dígitos (o ser un número especial de 3-4 dígitos, como el 911).');
  if (form.sucursales.length === 0) errores.push('Registre al menos una sucursal.');
  form.sucursales.forEach((s) => {
    if (!/^\d{3}$/.test(s.codigo)) errores.push(`Sucursal "${s.nombre}": código de 3 dígitos.`);
    if (s.terminales.length === 0) errores.push(`Sucursal ${s.codigo}: registre al menos una terminal.`);
    s.terminales.forEach((t) => !/^\d{5}$/.test(t) && errores.push(t ? `Sucursal ${s.codigo}: la terminal ${t} debe tener 5 dígitos.` : `Sucursal ${s.codigo}: complete o quite la terminal vacía (sobra una coma).`));
    repetidas(s.terminales).forEach((t) => errores.push(`Sucursal ${s.codigo}: la terminal ${t} está repetida.`));
  });
  // Dos sucursales con el mismo código compartirían la numeración consecutiva (Nota 3).
  repetidas(form.sucursales.map((s) => s.codigo)).forEach((c) => errores.push(`El código de sucursal ${c} está repetido.`));
  form.telefonosSinpe.forEach((t) => !/^\d{8}$/.test(t) && errores.push(`Número SINPE ${t || '(vacío)'}: 8 dígitos.`));
  repetidas(form.telefonosSinpe).forEach((t) => errores.push(`El número SINPE ${t} está repetido.`));

  const [guardando, setGuardando] = useState(false);
  const guardar = async () => {
    setGuardando(true);
    try {
      const id = await backend.guardarEmisor({ ...form, correos: form.correos.filter(Boolean) });
      seleccionarEmisor(id);
      setCreando(false);
      avisar('Emisor guardado.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setGuardando(false);
    }
  };

  /** Consulta pública del Ministerio de Hacienda (GET /fe/ae): nombre y actividades inscritas. */
  const consultarHacienda = async () => {
    setConsultando(true);
    try {
      const r = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${encodeURIComponent(form.identificacion.numero)}`);
      if (r.status === 404) throw new Error('La identificación no figura en el padrón público de Hacienda.');
      if (r.status === 429) throw new Error('Límite de consultas del API excedido; intente en unos minutos.');
      if (!r.ok) throw new Error(`El API respondió ${r.status}.`);
      const j = (await r.json()) as { nombre: string; actividades: { estado: string; codigo: string; descripcion: string; tipo: string }[] };
      set({
        nombre: form.nombre || j.nombre,
        actividades: j.actividades.filter((a) => a.estado === 'A').map((a) => ({ codigo: a.codigo, descripcion: a.descripcion, principal: a.tipo === 'P' })),
      });
      avisar('Actividades obtenidas del API público de Hacienda.', 'ok');
    } catch (e) {
      avisar((e as Error).message, 'err');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Emisor y actividades económicas</h1>
          <p>Datos del obligado tributario que figuran en el nodo &lt;Emisor&gt; y en la clave numérica.</p>
        </div>
        <div className="row">
          {emisor && !creando && (
            <button className="btn" onClick={() => { setCreando(true); setForm(nuevoEmisor()); }}>
              <Plus /> Nuevo emisor
            </button>
          )}
          {emisor && creando && (
            <button className="btn" onClick={() => { setCreando(false); setForm(emisor); }}>
              Cancelar
            </button>
          )}
          <button className="btn btn-primary" disabled={errores.length > 0 || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : creando ? 'Crear emisor' : 'Guardar'}
          </button>
        </div>
      </div>

      {errores.length > 0 && (
        <div className="card">
          <div className="card-body">
            <Alerta tipo="warn">
              <strong>Pendiente antes de guardar:</strong>
              <ul className="lista-errores">{errores.map((e) => <li key={e}>{e}</li>)}</ul>
            </Alerta>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>Identificación</h2></div>
        <div className="card-body grid grid-3">
          <Texto etiqueta="Nombre o razón social" valor={form.nombre} onCambio={(v) => set({ nombre: v })} requerido max={100} />
          <Texto etiqueta="Nombre comercial" valor={form.nombreComercial} onCambio={(v) => set({ nombreComercial: v || undefined })} max={80} />
          <Selector etiqueta="Condición" valor={form.condicion} onCambio={(v) => set({ condicion: v as Emisor['condicion'] })} mostrarCodigo={false}
            opciones={[
              { codigo: 'emisor-receptor', descripcion: 'Emisor receptor electrónico' },
              { codigo: 'no-confirmante', descripcion: 'Emisor receptor electrónico no confirmante' },
              { codigo: 'receptor-no-emisor', descripcion: 'Receptor electrónico no emisor' },
            ]}
            ayuda="Art. 2 incisos 9, 10 y 21 del Decreto 44739-H." />
          <Selector etiqueta="Tipo de identificación" valor={form.identificacion.tipo} onCambio={(v) => set({ identificacion: { ...form.identificacion, tipo: v } })} opciones={TIPO_IDENTIFICACION.slice(0, 4)} requerido />
          <CampoConAccion etiqueta="Número de identificación" valor={form.identificacion.numero} onCambio={(v) => set({ identificacion: { ...form.identificacion, numero: limpiarIdentificacion(form.identificacion.tipo, v) } })} alfanumerico={form.identificacion.tipo === '02'} accion={
            <button className="btn btn-sm" onClick={consultarHacienda} disabled={consultando || !!eId} title="Consulta pública GET /fe/ae">
              <Search /> Consultar
            </button>
          } ayuda="Sin guiones. Física 9 dígitos, jurídica 10 caracteres (admite letras desde la actualización v4.4), DIMEX 11-12, NITE 10." />
          <Texto etiqueta="Proveedor de sistemas" valor={form.proveedorSistemas} onCambio={(v) => set({ proveedorSistemas: v.replace(/\s/g, '') })} requerido ayuda="Cédula del proveedor; si es desarrollo propio, la del mismo emisor." />
          <Texto etiqueta="Registro fiscal bebidas alcohólicas (Ley 8707)" valor={form.registroFiscal8707} onCambio={(v) => set({ registroFiscal8707: v || undefined })} max={12} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Ubicación y contacto</h2></div>
        <div className="card-body grid grid-3">
          <UbicacionCampos valor={form.ubicacion} onCambio={(u) => set({ ubicacion: u })} />
          <Texto etiqueta="Teléfono" valor={form.telefono?.numero} onCambio={(v) => set({ telefono: v ? { codigoPais: '506', numero: v.replace(/\D/g, '') } : undefined })} ayuda="8 a 20 dígitos." />
          {form.correos.map((c, i) => (
            <Texto key={i} etiqueta={`Correo ${i + 1}`} tipo="email" valor={c} onCambio={(v) => set({ correos: form.correos.map((x, j) => (j === i ? v : x)) })} requerido={i === 0} />
          ))}
          {form.correos.length < 4 && (
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => set({ correos: [...form.correos, ''] })}><Plus /> Agregar correo (máx. 4)</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Actividades económicas</h2>
          <button className="btn btn-sm" onClick={() => set({ actividades: [...form.actividades, { codigo: '', descripcion: '', principal: form.actividades.length === 0 }] })}><Plus /> Agregar</button>
        </div>
        <div className="card-body stack">
          <p className="small muted" style={{ margin: 0 }}>
            Desde el 6/10/2025 TRIBU-CR usa la clasificación CIIU 4 (formato como «6920.0»). El campo CodigoActividadEmisor es obligatorio en FE, FEE y TE.
          </p>
          {form.actividades.map((a, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ width: 140 }}><Texto etiqueta="Código" valor={a.codigo} placeholder="6920.0" onCambio={(v) => set({ actividades: form.actividades.map((x, j) => (j === i ? { ...x, codigo: v.trim() } : x)) })} max={6} /></div>
              <div style={{ flex: 1, minWidth: 200 }}><Texto etiqueta="Descripción" valor={a.descripcion} onCambio={(v) => set({ actividades: form.actividades.map((x, j) => (j === i ? { ...x, descripcion: v } : x)) })} /></div>
              <label className="check" style={{ marginBottom: 8 }}>
                <input type="radio" name="principal" checked={!!a.principal} onChange={() => set({ actividades: form.actividades.map((x, j) => ({ ...x, principal: j === i })) })} /> Principal
              </label>
              <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar actividad" onClick={() => {
                // Si se elimina la principal, la primera de las restantes pasa a serlo.
                const restantes = form.actividades.filter((_, j) => j !== i);
                set({ actividades: restantes.some((x) => x.principal) ? restantes : restantes.map((x, j) => ({ ...x, principal: j === 0 })) });
              }}><Trash2 /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Sucursales y terminales</h2>
            <button className="btn btn-sm" onClick={() => set({ sucursales: [...form.sucursales, { codigo: String(form.sucursales.length + 1).padStart(3, '0'), nombre: 'Sucursal', terminales: ['00001'] }] })}><Plus /> Sucursal</button>
          </div>
          <div className="card-body stack">
            <p className="small muted" style={{ margin: 0 }}>001 = casa matriz; 002 en adelante, sucursales. Terminal 00001 si hay una sola o servidor centralizado (Nota 3).</p>
            {form.sucursales.map((s, i) => (
              <div key={i} className="linea-card">
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div style={{ width: 90 }}><Texto etiqueta="Código" valor={s.codigo} onCambio={(v) => set({ sucursales: form.sucursales.map((x, j) => (j === i ? { ...x, codigo: v.replace(/\D/g, '').slice(0, 3) } : x)) })} /></div>
                  <div style={{ flex: 1 }}><Texto etiqueta="Nombre" valor={s.nombre} onCambio={(v) => set({ sucursales: form.sucursales.map((x, j) => (j === i ? { ...x, nombre: v } : x)) })} /></div>
                  {form.sucursales.length > 1 && <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar sucursal" onClick={() => set({ sucursales: form.sucursales.filter((_, j) => j !== i) })}><Trash2 /></button>}
                </div>
                <Texto etiqueta="Terminales (separadas por coma)" valor={s.terminales.join(', ')} onCambio={(v) => set({ sucursales: form.sucursales.map((x, j) => (j === i ? { ...x, terminales: separarTerminales(v) } : x)) })} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Números SINPE Móvil</h2>
            <button className="btn btn-sm" onClick={() => set({ telefonosSinpe: [...form.telefonosSinpe, ''] })}><Plus /> Número</button>
          </div>
          <div className="card-body stack">
            <Alerta tipo="info">
              El Decreto 45953-H (La Gaceta, 16/10/2026) adiciona el inciso 3 al art. 22 del Reglamento de Procedimiento Tributario: los números SINPE Móvil usados
              como medio de pago en la actividad deben registrarse en el RUT, según la resolución general que emita la Administración Tributaria (plazo de 12 meses para inscritos).
            </Alerta>
            {form.telefonosSinpe.map((t, i) => (
              <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><Texto etiqueta={`Número ${i + 1}`} valor={t} onCambio={(v) => set({ telefonosSinpe: form.telefonosSinpe.map((x, j) => (j === i ? v.replace(/\D/g, '').slice(0, 8) : x)) })} /></div>
                <button className="btn btn-ghost btn-icon btn-danger" aria-label="Eliminar número" onClick={() => set({ telefonosSinpe: form.telefonosSinpe.filter((_, j) => j !== i) })}><Trash2 /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Campo de texto con un botón de acción al lado (consulta al API de Hacienda). */
function CampoConAccion({ etiqueta, valor, onCambio, accion, ayuda, alfanumerico }: { etiqueta: string; valor: string; onCambio: (v: string) => void; accion: ReactNode; ayuda?: string; alfanumerico?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta} *</label>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id={id} inputMode={alfanumerico ? 'text' : 'numeric'} value={valor} onChange={(e) => onCambio(e.target.value)} maxLength={12} />
        {accion}
      </div>
      {ayuda && <span className="hint">{ayuda}</span>}
    </div>
  );
}
