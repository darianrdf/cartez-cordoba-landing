/**
 * Genera public/og.png (imagen para compartir el link en WhatsApp, Instagram, etc.).
 * Uso: npm run og
 *
 * 1200×630, fondo blanco, logo redondo centrado y el nombre debajo.
 * Composición centrada a propósito: algunas apps recortan la vista previa en cuadrado.
 * El texto se dibuja con las fuentes del sistema; si se genera en otra máquina puede variar
 * levemente la tipografía.
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ANCHO = 1200;
const ALTO = 630;
const FONDO = '#ffffff';
const COLOR_TEXTO = '#13216B';
const TEXTO = 'Comisión Córdoba – Ateneo CARTEZ';
const ALTO_LOGO = 400;
const MARGEN_SUPERIOR = 60;
const TAMANO_TEXTO = 56;
const BASE_TEXTO = 565;

const raiz = (ruta) => fileURLToPath(new URL(`../${ruta}`, import.meta.url));
const entradaLogo = raiz('src/assets/logos/logo-redondo.png');
const salida = raiz('public/og.png');

const escaparXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const logo = await sharp(entradaLogo).resize({ height: ALTO_LOGO }).toBuffer();
const { width: anchoLogo = 0 } = await sharp(logo).metadata();

const texto = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
    <text x="${ANCHO / 2}" y="${BASE_TEXTO}" text-anchor="middle"
      font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${TAMANO_TEXTO}" font-weight="700"
      fill="${COLOR_TEXTO}">${escaparXml(TEXTO)}</text>
  </svg>`,
);

await sharp({ create: { width: ANCHO, height: ALTO, channels: 3, background: FONDO } })
  .composite([
    { input: logo, top: MARGEN_SUPERIOR, left: Math.round((ANCHO - anchoLogo) / 2) },
    { input: texto, top: 0, left: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(salida);

console.log(`Imagen generada: ${salida} (${ANCHO}×${ALTO})`);
