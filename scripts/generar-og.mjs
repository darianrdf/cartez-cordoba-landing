/**
 * Genera public/og.png (imagen para compartir el link en WhatsApp, Instagram, etc.).
 * Uso: npm run og (regenera antes el logo en disco con npm run logo).
 *
 * 1200×630: foto del hero de escritorio con velo navy, el logo en disco blanco a la izquierda,
 * "Comisión Córdoba" en Fraunces blanco y "Ateneo CARTEZ" en dorado debajo.
 *
 * El texto se convierte en trazos (opentype.js + los .woff de @fontsource), así que el
 * resultado no depende de las fuentes instaladas en la máquina.
 * Colores: tokens navy, gold y white de src/styles/global.css.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const ANCHO = 1200;
const ALTO = 630;
const NAVY = '#13216b';
const GOLD = '#c9a13b';
const WHITE = '#ffffff';

const TITULO = 'Comisión Córdoba';
const SUBTITULO = 'ATENEO CARTEZ';

const LADO_LOGO = 300;
const X_LOGO = 90;
const X_TEXTO = X_LOGO + LADO_LOGO + 60;
const ANCHO_MAX_TEXTO = ANCHO - X_TEXTO - 70;

const raiz = (ruta) => fileURLToPath(new URL(`../${ruta}`, import.meta.url));

function cargarFuente(ruta) {
  const buffer = readFileSync(raiz(ruta));
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}
const fraunces = cargarFuente('node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff');
const inter = cargarFuente('node_modules/@fontsource/inter/files/inter-latin-600-normal.woff');

/** Path SVG de un texto con espaciado entre letras opcional (en px). */
function trazo(fuente, texto, x, y, tamano, espaciado = 0) {
  if (!espaciado) return { d: fuente.getPath(texto, x, y, tamano, { kerning: true }).toPathData(2), ancho: fuente.getAdvanceWidth(texto, tamano) };
  let cursor = x;
  const partes = [];
  for (const letra of texto) {
    partes.push(fuente.getPath(letra, cursor, y, tamano).toPathData(2));
    cursor += fuente.getAdvanceWidth(letra, tamano) + espaciado;
  }
  return { d: partes.join(' '), ancho: cursor - espaciado - x };
}

// El título se achica si no entra en el ancho disponible.
let tamanoTitulo = 80;
while (fraunces.getAdvanceWidth(TITULO, tamanoTitulo) > ANCHO_MAX_TEXTO) tamanoTitulo -= 2;

const tamanoSub = 28;
const yTitulo = ALTO / 2 + 6;
const titulo = trazo(fraunces, TITULO, X_TEXTO, yTitulo, tamanoTitulo);
const subtitulo = trazo(inter, SUBTITULO, X_TEXTO + 2, yTitulo + 62, tamanoSub, tamanoSub * 0.3);

const capaTexto = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
    <defs>
      <linearGradient id="velo" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="${NAVY}" stop-opacity="0.92"/>
        <stop offset="0.65" stop-color="${NAVY}" stop-opacity="0.8"/>
        <stop offset="1" stop-color="${NAVY}" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>
    <rect x="${X_TEXTO + 2}" y="${yTitulo - tamanoTitulo - 34}" width="64" height="6" rx="3" fill="${GOLD}"/>
    <path d="${titulo.d}" fill="${WHITE}"/>
    <path d="${subtitulo.d}" fill="${GOLD}"/>
  </svg>`,
);

const fondo = await sharp(raiz('src/assets/fotos/hero-escritorio-ganado-atardecer.jpg'))
  .resize(ANCHO, ALTO, { fit: 'cover', position: 'centre' })
  .toBuffer();

const logo = await sharp(raiz('src/assets/logos/logo-disco.png')).resize(LADO_LOGO, LADO_LOGO).toBuffer();
// Sombra suave detrás del disco para despegarlo del fondo.
const sombra = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO_LOGO + 60}" height="${LADO_LOGO + 60}">
      <circle cx="${(LADO_LOGO + 60) / 2}" cy="${(LADO_LOGO + 60) / 2 + 8}" r="${LADO_LOGO / 2}" fill="#000" fill-opacity="0.35"/>
    </svg>`,
  ),
)
  .blur(12)
  .png()
  .toBuffer();

await sharp(fondo)
  .composite([
    { input: capaTexto, top: 0, left: 0 },
    { input: sombra, top: Math.round((ALTO - LADO_LOGO) / 2) - 30, left: X_LOGO - 30 },
    { input: logo, top: Math.round((ALTO - LADO_LOGO) / 2), left: X_LOGO },
  ])
  // PNG con paleta cuantizada: mantiene la calidad visual y queda liviano para WhatsApp (<300 KB).
  .png({ compressionLevel: 9, palette: true, quality: 90, colors: 256, dither: 1 })
  .toFile(raiz('public/og.png'));

console.log(`Imagen generada: public/og.png (${ANCHO}×${ALTO}, título a ${tamanoTitulo}px)`);
