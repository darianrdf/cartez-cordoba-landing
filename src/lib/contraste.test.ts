import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_TEXTO_GRANDE, AA_TEXTO_NORMAL, COLORES, contraste, type Color } from './contraste';

const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');

describe('tokens de global.css', () => {
  it.each(Object.entries(COLORES))('--%s coincide con la paleta', (nombre, valor) => {
    const m = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
    expect(m, `falta --${nombre} en global.css`).not.toBeNull();
    expect(m![1]!.toLowerCase()).toBe(valor);
  });
});

/** [texto, fondo, dónde se usa] */
type Par = [Color, Color, string];

const textoNormal: Par[] = [
  ['ink', 'white', 'cuerpo'],
  ['ink', 'tint-green', 'cuerpo en Eventos'],
  ['ink', 'tint-gold', 'cuerpo sobre tinte dorado'],
  ['navy', 'white', 'títulos y texto destacado'],
  ['navy', 'tint-green', 'títulos en Eventos'],
  ['navy', 'tint-gold', 'iniciales de la Comisión'],
  ['navy-muted', 'white', 'texto atenuado'],
  ['navy-muted', 'tint-green', 'texto atenuado en Eventos'],
  ['green-strong', 'white', 'texto verde'],
  ['green-strong', 'tint-green', 'texto verde en Eventos'],
  ['white', 'green-strong', 'botón Sumate'],
  ['white', 'navy', 'Contacto y hero'],
  ['gold', 'navy', 'acentos dorados sobre navy'],
  ['navy', 'gold', 'botones dorados de Contacto'],
  ['on-dark-muted', 'navy', 'texto atenuado en Contacto'],
  ['white', 'navy-deep', 'footer'],
  ['gold', 'navy-deep', 'acentos en el footer'],
  ['on-dark-muted', 'navy-deep', 'texto atenuado en el footer'],
];

const textoGrande: Par[] = [['green', 'white', 'texto grande e íconos verdes']];

describe('contraste WCAG AA', () => {
  it.each(textoNormal)('%s sobre %s (%s) ≥ 4.5', (texto, fondo) => {
    expect(contraste(COLORES[texto], COLORES[fondo])).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
  });

  it.each(textoGrande)('%s sobre %s (%s) ≥ 3', (texto, fondo) => {
    expect(contraste(COLORES[texto], COLORES[fondo])).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE);
  });

  it('el dorado nunca alcanza para texto sobre blanco (solo decorativo)', () => {
    expect(contraste(COLORES.gold, COLORES.white)).toBeLessThan(AA_TEXTO_GRANDE);
  });

  it('el verde #1F9A50 no alcanza para texto normal: se usa green-strong', () => {
    expect(contraste(COLORES.green, COLORES.white)).toBeLessThan(AA_TEXTO_NORMAL);
  });

  it('valores de referencia', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste(COLORES['green-strong'], COLORES.white)).toBeCloseTo(5.4, 1);
    expect(contraste(COLORES.gold, COLORES.navy)).toBeCloseTo(5.9, 1);
  });
});
