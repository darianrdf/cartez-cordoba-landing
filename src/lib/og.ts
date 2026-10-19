/**
 * Imagen para compartir (Open Graph) de un flyer: entero, centrado en 1200×630 sobre un color de
 * fondo. Astro no lo hace: su `fit: 'contain'` achica la imagen pero no agrega el fondo (en sharp
 * es `inside`), así que un flyer vertical quedaba de 420×630. Se usa en el build
 * (src/pages/eventos/[slug]/og.jpg.ts).
 */
import sharp from 'sharp';

export const OG_ANCHO = 1200;
export const OG_ALTO = 630;

export async function ogSinRecortar(imagen: ArrayBuffer | Buffer, fondo: string): Promise<Buffer> {
  return sharp(Buffer.isBuffer(imagen) ? imagen : Buffer.from(imagen))
    .rotate()
    .resize({ width: OG_ANCHO, height: OG_ALTO, fit: 'contain', background: fondo })
    .flatten({ background: fondo })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export interface OpcionesOgDeFlyer {
  fondo: string;
  fetch?: typeof fetch;
  log?: Pick<Console, 'warn'>;
  timeoutMs?: number;
}

/**
 * Baja el flyer y arma su imagen para compartir. Si algo falla (red, respuesta HTTP o sharp),
 * avisa en el log y devuelve undefined: la página usa la foto del tipo y el build sigue.
 */
export async function ogDeFlyer(url: string, opciones: OpcionesOgDeFlyer): Promise<Buffer | undefined> {
  const { fondo, fetch: f = fetch, log = console, timeoutMs = 15_000 } = opciones;
  try {
    const respuesta = await f(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!respuesta.ok) throw new Error(`la descarga respondió ${respuesta.status}`);
    return await ogSinRecortar(await respuesta.arrayBuffer(), fondo);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    log.warn(`[og] ⚠ No se pudo armar la imagen para compartir con el flyer ${url} (${motivo}). Se usa la foto del tipo.`);
    return undefined;
  }
}

const delBuild = new Map<string, Promise<Buffer | undefined>>();

/**
 * ogDeFlyer una sola vez por flyer y por build: la página del evento (decide qué og:image usar) y
 * el endpoint og.jpg (la genera) tienen que ver el mismo resultado.
 */
export function ogDeFlyerDelBuild(url: string, fondo: string): Promise<Buffer | undefined> {
  let resultado = delBuild.get(url);
  if (!resultado) {
    resultado = ogDeFlyer(url, { fondo });
    delBuild.set(url, resultado);
  }
  return resultado;
}
