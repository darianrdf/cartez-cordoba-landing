/**
 * Flyers de los eventos: se verifican una vez por build (data.ts). Un flyer que no se puede bajar
 * o que no es una imagen rompería el build (astro:assets lo descarga para la tarjeta y la página).
 * Ese evento sigue sin flyer: usa la foto de su tipo en la tarjeta, el detalle y Open Graph.
 */
import sharp from 'sharp';
import type { Evento } from './tipos';

export interface OpcionesFlyers {
  fetch?: typeof fetch;
  log?: Pick<Console, 'warn'>;
  timeoutMs?: number;
}

/** Motivo por el que el flyer no sirve, o undefined si se puede usar. */
async function problemaDelFlyer(url: string, f: typeof fetch, timeoutMs: number): Promise<string | undefined> {
  try {
    const respuesta = await f(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!respuesta.ok) return `la descarga respondió ${respuesta.status}`;
    const { width, height } = await sharp(Buffer.from(await respuesta.arrayBuffer())).metadata();
    return width && height ? undefined : 'no se pudo leer el tamaño';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Los mismos eventos, sin el flyer en los que no se puede usar (con un aviso en el log). */
export async function conFlyersDisponibles(eventos: readonly Evento[], opciones: OpcionesFlyers = {}): Promise<Evento[]> {
  const { fetch: f = fetch, log = console, timeoutMs = 15_000 } = opciones;
  return Promise.all(
    eventos.map(async (evento) => {
      if (typeof evento.flyer !== 'string') return evento;
      const problema = await problemaDelFlyer(evento.flyer, f, timeoutMs);
      if (!problema) return evento;
      log.warn(`[contenido] flyer no disponible: ${evento.slug} (${problema})`);
      const { flyer: _, ...sinFlyer } = evento;
      return sinFlyer;
    }),
  );
}
