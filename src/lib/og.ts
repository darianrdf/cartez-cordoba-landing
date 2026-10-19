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
