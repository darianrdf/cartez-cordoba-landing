/**
 * Paleta de la marca y cálculo de contraste WCAG 2.x. Módulo puro.
 *
 * Los valores de COLORES se repiten en src/styles/global.css (único lugar donde los usan
 * los componentes). contraste.test.ts verifica que ambos coincidan y que cada combinación
 * de texto real cumpla WCAG AA.
 */

/** Nombre del token en global.css (sin `--`) → valor hex. */
export const COLORES = {
  navy: '#13216b',
  'navy-deep': '#0b1440',
  green: '#1f9a50',
  'green-strong': '#177a3f',
  gold: '#c9a13b',
  ink: '#111111',
  white: '#ffffff',
  'tint-green': '#eff7f2',
  'tint-gold': '#fbf6e8',
  /** Texto atenuado sobre fondos claros (navy mezclado con blanco). */
  'navy-muted': '#47528c',
  /** Texto atenuado sobre fondos navy (blanco mezclado con navy-deep). */
  'on-dark-muted': '#c9cbd5',
} as const;

export type Color = keyof typeof COLORES;

function canales(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Color inválido: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa WCAG. */
export function luminancia(hex: string): number {
  const [r, g, b] = canales(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Mínimos WCAG AA. */
export const AA_TEXTO_NORMAL = 4.5;
export const AA_TEXTO_GRANDE = 3;
