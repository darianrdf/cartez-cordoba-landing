/**
 * Genera src/assets/logos/logo-disco.png: el logo redondo dentro de un disco blanco con
 * fondo transparente, para usarlo sobre fotos y fondos oscuros (hero, footer).
 * Uso: npm run logo
 *
 * El original (logo-redondo-original.jpeg) tiene fondo blanco y su anillo es levemente
 * ovalado, así que no se recorta justo sobre el anillo: el disco toma como diámetro el lado
 * mayor del original más un margen, y el logo queda centrado entero adentro.
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MARGEN = 0.06; // proporción del diámetro que queda libre alrededor del logo
const LADO_SALIDA = 800;

const raiz = (ruta) => fileURLToPath(new URL(`../${ruta}`, import.meta.url));
const entrada = raiz('src/assets/logos/logo-redondo-original.jpeg');
const salida = raiz('src/assets/logos/logo-disco.png');

const { width: ancho = 0, height: alto = 0 } = await sharp(entrada).metadata();
const diametro = Math.ceil(Math.max(ancho, alto) * (1 + 2 * MARGEN));
const radio = diametro / 2;

const mascara = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${diametro}" height="${diametro}">
    <circle cx="${radio}" cy="${radio}" r="${radio}" fill="#fff"/>
  </svg>`,
);

const disco = await sharp({
  create: { width: diametro, height: diametro, channels: 4, background: '#ffffff' },
})
  .composite([
    { input: entrada, top: Math.round((diametro - alto) / 2), left: Math.round((diametro - ancho) / 2) },
    { input: mascara, blend: 'dest-in' },
  ])
  .png()
  .toBuffer();

await sharp(disco).resize(LADO_SALIDA, LADO_SALIDA).png({ compressionLevel: 9 }).toFile(salida);

console.log(`Logo en disco generado: ${salida} (${LADO_SALIDA}×${LADO_SALIDA})`);
