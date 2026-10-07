/**
 * Helpers de imágenes sobre astro:assets. Aceptan imágenes locales (ImageMetadata) o URLs
 * remotas (string); las remotas deben estar permitidas en `image.remotePatterns` de
 * astro.config.mjs y se les infiere el tamaño.
 */
import { getImage } from 'astro:assets';
import type { Imagen } from '@/lib/tipos';

export const esRemota = (imagen: Imagen): imagen is string => typeof imagen === 'string';

/** Variantes responsivas de una imagen en un formato (para `<source srcset>` / `<img>`). */
export async function variantes(imagen: Imagen, anchos: number[], formato: 'avif' | 'webp', calidad = 70) {
  const resultado = await getImage({
    src: imagen,
    widths: anchos,
    format: formato,
    quality: calidad,
    ...(esRemota(imagen) ? { inferSize: true } : {}),
  });
  return {
    src: resultado.src,
    srcset: resultado.srcSet.attribute,
    width: Number(resultado.attributes.width),
    height: Number(resultado.attributes.height),
  };
}

/** Props para `<Image>` según la imagen sea local o remota. */
export const propsImagen = (imagen: Imagen) => (esRemota(imagen) ? { src: imagen, inferSize: true as const } : { src: imagen });
