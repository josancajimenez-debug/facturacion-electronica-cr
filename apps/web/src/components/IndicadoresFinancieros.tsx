import {
  CATEGORIAS_INDICADORES,
  baseIndicadores,
  descomposicionDuPont,
  diagnosticoFinanciero,
  formatearIndicador,
  indicadoresFinancieros,
  type CategoriaIndicador,
  type EstadosFinancieros,
  type Indicador,
  type NivelIndicador,
} from '@fe-cr/core';
import { ChevronDown, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Campo } from './ui';

const NIVELES: Record<NivelIndicador, { texto: string; clase: string }> = {
  favorable: { texto: 'Favorable', clase: 'ok' },
  vigilar: { texto: 'Vigilar', clase: 'warn' },
  desfavorable: { texto: 'Desfavorable', clase: 'err' },
  'sin-datos': { texto: 'Sin datos', clase: '' },
};

function Nivel({ nivel }: { nivel: NivelIndicador }) {
  return <span className={`badge ${NIVELES[nivel].clase}`}>{NIVELES[nivel].texto}</span>;
}

function Tendencia({ i }: { i: Indicador }) {
  if (i.anterior === undefined) return null;
  const anterior = formatearIndicador(i.anterior, i.unidad);
  if (!i.tendencia) return <span className="small muted">Año anterior: {anterior}</span>;
  const Icono = i.tendencia === 'mejora' ? TrendingUp : i.tendencia === 'empeora' ? TrendingDown : Minus;
  const texto = { mejora: 'Mejora', empeora: 'Empeora', igual: 'Sin cambio' }[i.tendencia];
  return (
    <span className={`kpi-tendencia ${i.tendencia}`} title={`Mismo corte del año anterior: ${anterior}`}>
      <Icono aria-hidden /> {texto} <span className="muted">(antes {anterior})</span>
    </span>
  );
}

function Tarjeta({ i, abierta, alternar }: { i: Indicador; abierta: boolean; alternar: () => void }) {
  const id = `kpi-${i.id}`;
  return (
    <article className={`card kpi-card ${NIVELES[i.nivel].clase}`} aria-labelledby={`${id}-t`}>
      <div className="kpi-cabeza">
        <h3 id={`${id}-t`}>{i.nombre}</h3>
        <Nivel nivel={i.nivel} />
      </div>
      <div className="kpi-valor">{i.valor === null ? <span className="muted">N/A</span> : formatearIndicador(i.valor, i.unidad)}</div>
      <Tendencia i={i} />
      <p className="kpi-analisis">{i.analisis}</p>
      {i.accion && <p className="kpi-accion"><strong>Qué hacer:</strong> {i.accion}</p>}
      <button type="button" className="kpi-mas no-print" aria-expanded={abierta} aria-controls={`${id}-d`} onClick={alternar}>
        {abierta ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />} {abierta ? 'Ocultar la explicación' : 'Ver fórmula y explicación'}
      </button>
      <dl id={`${id}-d`} className={`kpi-detalle${abierta ? '' : ' kpi-cerrado'}`}>
        <dt>Qué mide</dt><dd>{i.mide}</dd>
        <dt>Fórmula</dt><dd className="mono">{i.formula}</dd>
        <dt>Cálculo con sus cifras</dt><dd className="mono">{i.calculo}{i.motivo ? ` (${i.motivo})` : ''}</dd>
        <dt>Cómo se interpreta</dt><dd>{i.interpretacion}</dd>
        <dt>Referencia</dt><dd>{i.referencia}</dd>
        <dt>Fuente</dt><dd className="small muted">{i.fuente}</dd>
      </dl>
    </article>
  );
}

/** Du Pont: el ROE como producto de margen, rotación y apalancamiento. */
function DuPont({ ef }: { ef: EstadosFinancieros }) {
  const dp = descomposicionDuPont(baseIndicadores(ef));
  if (!dp) return null;
  const factores = [
    { titulo: 'Margen neto', valor: formatearIndicador(dp.margen, 'porcentaje'), nota: 'Eficiencia operativa' },
    { titulo: 'Rotación de activos', valor: formatearIndicador(dp.rotacion, 'veces'), nota: 'Uso de los activos' },
    { titulo: 'Multiplicador del capital', valor: formatearIndicador(dp.multiplicador, 'veces'), nota: 'Apalancamiento' },
  ];
  return (
    <div className="card">
      <div className="card-head"><h3 style={{ margin: 0 }}>Identidad Du Pont: ¿de dónde viene el ROE?</h3></div>
      <div className="card-body">
        <div className="dupont" role="group" aria-label="Descomposición del ROE">
          {factores.map((f, k) => (
            <div key={f.titulo} className="dupont-paso">
              {k > 0 && <span className="dupont-op" aria-hidden>×</span>}
              <div className="dupont-caja">
                <span className="small muted">{f.titulo}</span>
                <strong>{f.valor}</strong>
                <span className="small muted">{f.nota}</span>
              </div>
            </div>
          ))}
          <div className="dupont-paso">
            <span className="dupont-op" aria-hidden>=</span>
            <div className="dupont-caja total">
              <span className="small muted">ROE anualizado</span>
              <strong>{formatearIndicador(dp.roe, 'porcentaje')}</strong>
              <span className="small muted">Rendimiento de los dueños</span>
            </div>
          </div>
        </div>
        <p className="small" style={{ marginBottom: 0 }}>
          El factor que más impulsa el ROE es <strong>{dp.motor}</strong>. Elevar el ROE con más deuda solo conviene si los activos rinden más que el costo de esa deuda: el gasto financiero adicional reduce el margen (Ross, cap. 3).
        </p>
      </div>
    </div>
  );
}

/** Ciclo de conversión del efectivo (Berk, cap. 26): días de inventario + cobro − pago. */
function CicloEfectivo({ k }: { k: Record<string, Indicador> }) {
  const inv = k['dias-inventario']?.valor ?? 0;
  const cob = k['dias-cobro']?.valor ?? 0;
  const pag = k['dias-pago']?.valor ?? 0;
  const ciclo = k['ciclo-efectivo']?.valor;
  if (ciclo === null || ciclo === undefined) return null;
  const escala = Math.max(inv + cob, pag, 1);
  const ancho = (d: number) => `${Math.max(0, (d / escala) * 100)}%`;
  const dias = (d: number) => formatearIndicador(d, 'dias');
  return (
    <div className="card">
      <div className="card-head"><h3 style={{ margin: 0 }}>Ciclo de conversión del efectivo</h3><strong>{dias(ciclo)}</strong></div>
      <div className="card-body stack">
        <div>
          <div className="small muted">Ciclo operativo: inventario {dias(inv)} + cobro {dias(cob)}</div>
          <div className="cce-barra" aria-hidden>
            <span className="cce-inv" style={{ width: ancho(inv) }} />
            <span className="cce-cob" style={{ width: ancho(cob) }} />
          </div>
        </div>
        <div>
          <div className="small muted">Crédito de proveedores: pago {dias(pag)}</div>
          <div className="cce-barra" aria-hidden><span className="cce-pag" style={{ width: ancho(pag) }} /></div>
        </div>
        <p className="small" style={{ margin: 0 }}>
          {ciclo < 0
            ? 'La empresa cobra antes de pagar: los proveedores financian la operación.'
            : `La empresa debe financiar ${dias(ciclo)} entre el pago de la mercadería y el cobro de la venta. Cada día que se acorte el ciclo libera efectivo.`}
        </p>
      </div>
    </div>
  );
}

type Filtro = CategoriaIndicador | 'todas';

export function IndicadoresFinancieros({ ef, anterior, costoCapital, onCostoCapital }: { ef: EstadosFinancieros; anterior?: EstadosFinancieros; costoCapital: number; onCostoCapital: (v: number) => void }) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [textoCosto, setTextoCosto] = useState(String(Math.round(costoCapital * 1000) / 10));

  const indicadores = useMemo(() => indicadoresFinancieros(ef, { anterior, parametros: { costoCapital } }), [ef, anterior, costoCapital]);
  const diagnostico = useMemo(() => diagnosticoFinanciero(indicadores), [indicadores]);
  const porId = useMemo(() => Object.fromEntries(indicadores.map((i) => [i.id, i])), [indicadores]);
  const visibles = indicadores.filter((i) => (filtro === 'todas' || i.categoria === filtro) && (!soloAlertas || i.nivel === 'vigilar' || i.nivel === 'desfavorable'));
  const categorias = Object.keys(CATEGORIAS_INDICADORES) as CategoriaIndicador[];
  const costoValido = textoCosto.trim() !== '' && Number(textoCosto) >= 0 && Number(textoCosto) <= 100;

  const alternar = (id: string) => setAbiertas((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const cambiarCosto = (v: string) => {
    setTextoCosto(v);
    const n = Number(v);
    if (v.trim() !== '' && n >= 0 && n <= 100) onCostoCapital(n / 100);
  };

  return (
    <div className="card-body stack indicadores">
      <div className="card">
        <div className="card-head">
          <h3 style={{ margin: 0 }}>Análisis de resultados</h3>
          <div className="row">
            <span className="badge ok">{diagnostico.conteo.favorable} favorables</span>
            <span className="badge warn">{diagnostico.conteo.vigilar} vigilar</span>
            <span className="badge err">{diagnostico.conteo.desfavorable} desfavorables</span>
          </div>
        </div>
        <div className="card-body stack">
          <p style={{ margin: 0 }}>{diagnostico.resumen}</p>
          <div className="kpi-categorias">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                className={`kpi-categoria ${NIVELES[diagnostico.categorias[c].nivel].clase}${filtro === c ? ' on' : ''}`}
                aria-pressed={filtro === c}
                onClick={() => setFiltro(filtro === c ? 'todas' : c)}
              >
                <span className="row" style={{ justifyContent: 'space-between' }}><strong>{CATEGORIAS_INDICADORES[c].nombre}</strong><Nivel nivel={diagnostico.categorias[c].nivel} /></span>
                <span className="small muted">{CATEGORIAS_INDICADORES[c].pregunta}</span>
                <span className="small">{diagnostico.categorias[c].texto}</span>
              </button>
            ))}
          </div>
          {diagnostico.acciones.length > 0 && (
            <div>
              <strong>Acciones prioritarias</strong>
              <ol className="recordatorios">{diagnostico.acciones.map((a) => <li key={a}>{a}</li>)}</ol>
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>
            Las rotaciones y rentabilidades se anualizan cuando el corte es anterior al 31 de diciembre. Los rangos son orientativos: la bibliografía recomienda comparar cada razón con la historia de la empresa y con su sector (Ross, cap. 3; Amat, cap. 8).
            {anterior ? ' Las flechas comparan con el mismo corte del año anterior.' : ''}
          </p>
        </div>
      </div>

      <div className="row no-print kpi-controles">
        <div className="segmented" role="group" aria-label="Filtrar por categoría">
          <button type="button" className={filtro === 'todas' ? 'on' : ''} aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todos</button>
          {categorias.map((c) => (
            <button key={c} type="button" className={filtro === c ? 'on' : ''} aria-pressed={filtro === c} onClick={() => setFiltro(c)}>{CATEGORIAS_INDICADORES[c].nombre}</button>
          ))}
        </div>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} /> Solo los que requieren atención
        </label>
        <button type="button" className="btn btn-sm" onClick={() => setAbiertas(abiertas.size ? new Set() : new Set(visibles.map((i) => i.id)))}>
          {abiertas.size ? 'Cerrar explicaciones' : 'Abrir todas las explicaciones'}
        </button>
        <div style={{ width: 200 }}>
          <Campo etiqueta="Costo de capital anual (%)" ayuda="Rendimiento mínimo que exigen los dueños; se usa en el ROE y el EVA." error={costoValido ? undefined : 'Escriba un porcentaje entre 0 y 100.'}>
            {(id) => <input id={id} type="number" min={0} max={100} step={0.5} value={textoCosto} onChange={(e) => cambiarCosto(e.target.value)} />}
          </Campo>
        </div>
      </div>

      {visibles.length === 0 && <p className="muted">No hay indicadores que requieran atención en esta categoría.</p>}
      <div className="grid grid-2 kpi-lista">
        {visibles.map((i) => <Tarjeta key={i.id} i={i} abierta={abiertas.has(i.id)} alternar={() => alternar(i.id)} />)}
      </div>

      {(filtro === 'todas' || filtro === 'rentabilidad') && <DuPont ef={ef} />}
      {(filtro === 'todas' || filtro === 'actividad') && <CicloEfectivo k={porId} />}
    </div>
  );
}
