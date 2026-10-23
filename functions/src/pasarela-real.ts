/**
 * Pasarela hacia el API REAL de recepción del Ministerio de Hacienda.
 *
 * DESHABILITADA DE FORMA DELIBERADA. Documenta los puntos de conexión del Anexo 3, pero no
 * envía nada: el proyecto no implementa la firma XAdES-EPES (Anexo 2) ni gestiona credenciales
 * reales. Cualquier intento de uso devuelve los motivos de bloqueo.
 */
import { URLS_HACIENDA, motivosBloqueoEnvioReal, type Ambiente } from '@fe-cr/core';

export class EnvioRealBloqueado extends Error {
  constructor(public motivos: string[]) {
    super(`Envío real bloqueado: ${motivos.join(' ')}`);
    this.name = 'EnvioRealBloqueado';
  }
}

export function enviarAHaciendaReal(_xml: string, ambiente: Ambiente): never {
  const motivos = motivosBloqueoEnvioReal({
    ambiente,
    autorizacionExpresa: process.env.HACIENDA_ENVIO_REAL_AUTORIZADO === 'si',
    tieneCredencialesAtv: Boolean(process.env.HACIENDA_API_USUARIO),
    tieneLlaveCriptografica: Boolean(process.env.HACIENDA_LLAVE_RUTA),
    firmaXadesImplementada: false,
  });
  // Referencia informativa de los destinos que usaría una implementación futura.
  void URLS_HACIENDA;
  throw new EnvioRealBloqueado(motivos);
}
