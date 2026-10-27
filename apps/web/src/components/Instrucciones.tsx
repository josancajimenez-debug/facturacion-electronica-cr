import { Link } from 'react-router-dom';

/** Dirección pública del sitio, la que se comparte con los participantes. */
export const ENLACE_APP = new URL(import.meta.env.BASE_URL, window.location.origin).href;

interface Paso {
  titulo: string;
  detalle: string[];
  /** Página de la herramienta donde se hace el paso (solo con sesión iniciada). */
  ruta?: { a: string; texto: string };
}

/**
 * Hoja de instrucciones para participantes: la usan la página «Primeros pasos» (con enlaces e impresión)
 * y la pantalla de ingreso (sin enlaces, porque allí todavía no hay rutas).
 */
export const PASOS: Paso[] = [
  {
    titulo: 'Cree su cuenta',
    detalle: [
      'Abra el enlace del simulador y pulse «¿No tiene cuenta? Crear una».',
      'Use su correo y una contraseña de al menos 6 caracteres. Anótela: el simulador no envía correos para recuperarla.',
    ],
  },
  {
    titulo: 'Cargue los datos de práctica',
    detalle: [
      'En la Bienvenida pulse «Cargar datos ficticios». Se crea un emisor de práctica con actividades, sucursales, receptores y productos con códigos CAByS 2025.',
      'Si prefiere, use «Registrar mi propio emisor» con datos inventados.',
    ],
  },
  {
    titulo: 'Conozca los registros',
    detalle: [
      'Revise «Emisor y actividades», «Receptores» y «Productos y servicios». Ahí están los datos que luego se copian a cada comprobante.',
    ],
    ruta: { a: '/emisor', texto: 'Ir a Emisor y actividades' },
  },
  {
    titulo: 'Emita su primera factura',
    detalle: [
      'En «Emitir comprobante» elija Factura electrónica, seleccione un receptor y agregue un producto del catálogo.',
      'Indique el medio de pago y revise el resumen y las validaciones de la derecha. Cuando no haya errores, pulse «Emitir».',
    ],
    ruta: { a: '/emitir', texto: 'Ir a Emitir comprobante' },
  },
  {
    titulo: 'Revise la respuesta de Hacienda (simulada)',
    detalle: [
      'En el detalle verá avanzar los estados hasta Aceptado o Rechazado.',
      'Revise las pestañas XML comprobante, Mensaje Hacienda y Representación gráfica, y descargue el XML y el PDF.',
    ],
    ruta: { a: '/comprobantes', texto: 'Ir a Comprobantes emitidos' },
  },
  {
    titulo: 'Practique otros casos',
    detalle: [
      'Desde un comprobante aceptado emita una nota de crédito o de débito.',
      'En «Recepción» simule un comprobante de proveedor y confírmelo (05 aceptación, 06 parcial, 07 rechazo).',
      'En «Escenarios de prueba» ejecute los casos listos y compare con el resultado esperado.',
    ],
    ruta: { a: '/escenarios', texto: 'Ir a Escenarios de prueba' },
  },
  {
    titulo: 'Consulte la referencia',
    detalle: ['Use el «Glosario» para los términos y códigos y la «Matriz normativa» para la fuente de cada regla.'],
    ruta: { a: '/glosario', texto: 'Ir al Glosario' },
  },
];

export const RECORDATORIOS = [
  'Es un entorno de simulación: nada se envía al Ministerio de Hacienda y los documentos no tienen validez tributaria.',
  'Sus datos son privados: cada cuenta ve solo sus propios emisores y comprobantes.',
  'Para empezar de cero use Configuración › Limpieza de datos › «Limpiar mis datos» y vuelva a cargar los datos ficticios.',
  'Funciona en cualquier navegador actualizado, en computadora o celular.',
];

export function Pasos({ enlaces = false }: { enlaces?: boolean }) {
  return (
    <ol className="pasos">
      {PASOS.map((p) => (
        <li key={p.titulo}>
          <strong>{p.titulo}</strong>
          {p.detalle.map((d) => (
            <p key={d}>{d}</p>
          ))}
          {enlaces && p.ruta && (
            <Link className="small no-print" to={p.ruta.a}>
              {p.ruta.texto} →
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}
