/**
 * Flyers de los eventos: se verifican una vez por build (data.ts). Un flyer que no se puede bajar
 * o que no es una imagen rompería el build (astro:assets lo descarga para la tarjeta y la página).
 * Ese evento sigue sin flyer: usa la foto de su tipo en la tarjeta, el detalle y Open Graph.
 * Si la red falla o Storage responde 5xx, se reintenta una vez a los ~2 s; un 4xx o un archivo
 * que no es imagen no se reintenta.
 */
import sharp from 'sharp';
import type { Evento } from './tipos';

export interface OpcionesFlyers {
  fetch?: typeof fetch;
  log?: Pick<Console, 'warn'>;
  timeoutMs?: number;
  /** Espera antes del único reintento (red caída o error 5xx). */
  esperaReintentoMs?: number;
  /** Para los tests: cómo se espera. */
  esperar?: (ms: number) => Promise<void>;
}

const esperarDeVerdad = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

type Descarga = { ok: true; datos: ArrayBuffer } | { ok: false; motivo: string; reintentable: boolean };

/** Baja el flyer. Falla de red, timeout o 5xx: se puede reintentar; 4xx no (el archivo no está). */
async function descargar(url: string, f: typeof fetch, timeoutMs: number): Promise<Descarga> {
  try {
    const respuesta = await f(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!respuesta.ok) {
      return { ok: false, motivo: `la descarga respondió ${respuesta.status}`, reintentable: respuesta.status >= 500 };
    }
    return { ok: true, datos: await respuesta.arrayBuffer() };
  } catch (error) {
    return { ok: false, motivo: error instanceof Error ? error.message : String(error), reintentable: true };
  }
}

/** Motivo por el que el flyer no sirve, o undefined si se puede usar. */
async function problemaDelFlyer(url: string, opciones: Required<Omit<OpcionesFlyers, 'log'>>): Promise<string | undefined> {
  const { fetch: f, timeoutMs, esperaReintentoMs, esperar } = opciones;
  let descarga = await descargar(url, f, timeoutMs);
  if (!descarga.ok && descarga.reintentable) {
    await esperar(esperaReintentoMs);
    descarga = await descargar(url, f, timeoutMs);
  }
  if (!descarga.ok) return descarga.motivo;
  // Un archivo que no es una imagen no se arregla reintentando.
  try {
    const { width, height } = await sharp(Buffer.from(descarga.datos)).metadata();
    return width && height ? undefined : 'no se pudo leer el tamaño';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Los mismos eventos, sin el flyer en los que no se puede usar (con un aviso en el log). */
export async function conFlyersDisponibles(eventos: readonly Evento[], opciones: OpcionesFlyers = {}): Promise<Evento[]> {
  const {
    fetch: f = fetch,
    log = console,
    timeoutMs = 15_000,
    esperaReintentoMs = 2_000,
    esperar = esperarDeVerdad,
  } = opciones;
  return Promise.all(
    eventos.map(async (evento) => {
      if (typeof evento.flyer !== 'string') return evento;
      const problema = await problemaDelFlyer(evento.flyer, { fetch: f, timeoutMs, esperaReintentoMs, esperar });
      if (!problema) return evento;
      log.warn(`[contenido] flyer no disponible: ${evento.slug} (${problema})`);
      const { flyer: _, ...sinFlyer } = evento;
      return sinFlyer;
    }),
  );
}
