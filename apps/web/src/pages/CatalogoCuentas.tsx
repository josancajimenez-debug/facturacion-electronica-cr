import { CATALOGO_CUENTAS, edicionNiifPara, nivelCuenta, seccionNiif, type Cuenta } from '@fe-cr/core';
import { Download, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Texto } from '../components/ui';
import { useApp } from '../estado';
import { useContabilidad, type ConfigContable } from '../lib/contabilidad';
import { csv, descargar, hoyCR } from '../lib/formato';

const TIPO: Record<Cuenta['tipo'], string> = { activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio', ingreso: 'Ingreso', costo: 'Costo', gasto: 'Gasto' };

export function CatalogoCuentas() {
  const { avisar } = useApp();
  const { config, guardarConfig } = useContabilidad();
  const [borrador, setBorrador] = useState<ConfigContable>(config);
  const [filtro, setFiltro] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const edicion = edicionNiifPara(hoyCR(), borrador.politicas.adopcionAnticipadaNiif2025);
  const p = borrador.politicas;
  const cambiar = (politicas: Partial<ConfigContable['politicas']>) => setBorrador({ ...borrador, politicas: { ...p, ...politicas } });

  const texto = filtro.trim().toLowerCase();
  const cuentas = texto
    ? CATALOGO_CUENTAS.filter((c) => c.codigo.startsWith(texto) || `${c.nombre} ${c.descripcion ?? ''}`.toLowerCase().includes(texto))
    : CATALOGO_CUENTAS;

  const guardar = () => {
    if (!(p.umbralCapitalizacion >= 0)) return avisar('El umbral de capitalización debe ser un monto válido.', 'err');
    // La apertura se edita en su propia página: se conserva la guardada.
    guardarConfig({ ...borrador, apertura: config.apertura });
    avisar('Políticas contables guardadas. Los libros se recalcularon.', 'ok');
  };

  const exportar = () =>
    descargar('catalogo-y-manual-de-cuentas.csv', csv([
      ['Código', 'Cuenta', 'Tipo', 'Naturaleza', 'Imputable', 'Descripción', 'Se debita', 'Se acredita', 'NIIF para las PYMES'],
      ...CATALOGO_CUENTAS.map((c) => [c.codigo, c.nombre, TIPO[c.tipo], c.naturaleza, c.imputable ? 'Sí' : 'No', c.descripcion, c.seDebita, c.seAcredita, c.niif ? seccionNiif(c.niif, edicion) : '']),
    ]), 'text/csv');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Catálogo de cuentas y manual</h1>
          <p>Plan de cuentas para PYMES bajo la NIIF para las PYMES ({edicion}). Seleccione una subcuenta para ver su manual: qué representa, cuándo se debita y cuándo se acredita.</p>
        </div>
        <button className="btn" onClick={exportar}><Download /> CSV</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h2>Políticas contables</h2></div>
        <div className="card-body stack">
          <div className="grid grid-2">
            <Texto etiqueta="Umbral de capitalización (₡ por unidad)" tipo="number" valor={p.umbralCapitalizacion} onCambio={(v) => cambiar({ umbralCapitalizacion: Number(v) })}
              ayuda="Equipo, mobiliario, vehículos y obras con costo unitario igual o mayor se registran como propiedades, planta y equipo (Sección 17); por debajo, como gasto." />
            <Texto etiqueta="Prefijos CAByS de mercadería adicional" valor={p.prefijosInventario.join(', ')} onCambio={(v) => cambiar({ prefijosInventario: v.split(',').map((x) => x.trim()).filter(Boolean) })}
              ayuda="Las compras de bienes que también están en «Productos y servicios» ya se tratan como inventario. Agregue aquí otros prefijos (p. ej. 2391)." />
          </div>
          <label className="check">
            <input type="checkbox" checked={p.adopcionAnticipadaNiif2025} onChange={(e) => cambiar({ adopcionAnticipadaNiif2025: e.target.checked })} />
            Adopción anticipada de la tercera edición (2025), obligatoria para periodos que inician desde el 1/01/2027; debe revelarse.
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            El asiento de apertura (aporte de capital o saldos del balance anterior) se registra en <Link to="/contabilidad/apertura">Balance de apertura</Link>.
          </p>
          <div><button className="btn btn-primary" onClick={guardar}><Save /> Guardar políticas</button></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Cuentas ({CATALOGO_CUENTAS.filter((c) => c.imputable).length} subcuentas)</h2>
          <div style={{ width: 260 }}><Texto etiqueta="Buscar" valor={filtro} onCambio={setFiltro} placeholder="Código, nombre o concepto" /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Naturaleza</th><th>NIIF</th></tr></thead>
            <tbody>
              {cuentas.map((c) => {
                const nivel = nivelCuenta(c.codigo);
                const abiertaAqui = abierta === c.codigo;
                return [
                  <tr key={c.codigo} style={{ fontWeight: nivel <= 2 ? 650 : undefined }}>
                    <td className="mono small nowrap">{c.codigo}</td>
                    <td style={{ paddingLeft: 12 + (nivel - 1) * 16 }}>
                      {c.imputable ? (
                        <button className="btn btn-ghost btn-sm" style={{ padding: 0, minHeight: 0, fontWeight: 'inherit' }} aria-expanded={abiertaAqui} onClick={() => setAbierta(abiertaAqui ? null : c.codigo)}>
                          {c.nombre}
                        </button>
                      ) : c.nombre}
                    </td>
                    <td className="small">{TIPO[c.tipo]}</td>
                    <td className="small">{c.naturaleza === 'deudora' ? 'Deudora' : 'Acreedora'}</td>
                    <td className="small nowrap">{c.niif ? `Secc. ${c.niif}` : ''}</td>
                  </tr>,
                  abiertaAqui && (
                    <tr key={`${c.codigo}-manual`}>
                      <td />
                      <td colSpan={4}>
                        <div className="stack small" style={{ gap: 6, padding: '4px 0 8px' }}>
                          <div>{c.descripcion}</div>
                          <div><strong>Se debita:</strong> {c.seDebita}</div>
                          <div><strong>Se acredita:</strong> {c.seAcredita}</div>
                          {c.niif && <div className="muted">{seccionNiif(c.niif, edicion)}</div>}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
