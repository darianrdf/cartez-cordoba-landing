import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { COLORES } from './contraste';
import { OG_ALTO, OG_ANCHO, ogSinRecortar } from './og';

/** Un "flyer" vertical de 600×1000, todo rojo. */
const flyerVertical = () =>
  sharp({ create: { width: 600, height: 1000, channels: 3, background: '#ff0000' } }).png().toBuffer();

async function pixel(imagen: Buffer, x: number, y: number) {
  const { data, info } = await sharp(imagen).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

const cerca = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]!) <= 12);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('ogSinRecortar', () => {
  it('da un JPEG de 1200×630 aunque el flyer sea vertical', async () => {
    const og = await ogSinRecortar(await flyerVertical(), COLORES.navy);
    const { width, height, format } = await sharp(og).metadata();
    expect([width, height, format]).toEqual([OG_ANCHO, OG_ALTO, 'jpeg']);
  });

  it('el flyer queda entero en el centro y los costados son del color de fondo', async () => {
    const og = await ogSinRecortar(await flyerVertical(), COLORES.navy);
    expect(cerca(await pixel(og, 600, 315), [255, 0, 0])).toBe(true);
    expect(cerca(await pixel(og, 20, 315), rgb(COLORES.navy))).toBe(true);
    expect(cerca(await pixel(og, 1180, 315), rgb(COLORES.navy))).toBe(true);
    // Arriba y abajo no hay bandas: entra justo de alto (630 px).
    expect(cerca(await pixel(og, 600, 2), [255, 0, 0])).toBe(true);
    expect(cerca(await pixel(og, 600, 627), [255, 0, 0])).toBe(true);
  });
});
