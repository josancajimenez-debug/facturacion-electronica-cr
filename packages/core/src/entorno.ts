import type { Ambiente } from './tipos';

/**
 * Separación estricta de entornos.
 *
 * - "simulacion": todo el flujo (envío, recepción y respuesta) lo resuelve el simulador local.
 * - "produccion": requiere TODAS las condiciones siguientes; si falta una, se bloquea el envío.
 *
 * Este proyecto no implementa el envío real: aun cumpliendo las condiciones, la pasarela real
 * (functions/src/pasarela-real.ts) rehúsa enviar hasta que se incorpore la firma XAdES-EPES.
 */
export const URLS_HACIENDA = {
  // Anexo 3 de Anexos y Estructuras v4.4.
  recepcionProduccion: 'https://api.comprobanteselectronicos.go.cr/recepcion/v1/',
  recepcionSandbox: 'https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/',
  tokenIdp: 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token',
} as const;

export interface CondicionesEnvioReal {
  ambiente: Ambiente;
  autorizacionExpresa: boolean;
  tieneCredencialesAtv: boolean;
  tieneLlaveCriptografica: boolean;
  firmaXadesImplementada: boolean;
}

export function motivosBloqueoEnvioReal(c: CondicionesEnvioReal): string[] {
  const motivos: string[] = [];
  if (c.ambiente !== 'produccion') motivos.push('El ambiente configurado es de SIMULACIÓN.');
  if (!c.autorizacionExpresa) motivos.push('No existe autorización expresa del obligado tributario para enviar comprobantes reales.');
  if (!c.tieneCredencialesAtv) motivos.push('No hay credenciales del API de recepción (usuario y contraseña generados por la Administración Tributaria).');
  if (!c.tieneLlaveCriptografica) motivos.push('No hay llave criptográfica o certificado de firma digital configurado.');
  if (!c.firmaXadesImplementada) motivos.push('La firma XAdES-EPES (Anexo 2) no está implementada en este proyecto.');
  return motivos;
}
