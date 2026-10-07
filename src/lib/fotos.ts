/** Fotos por defecto de cada categoría de evento (ver CREDITOS.md). */
import actividad from '@/assets/fotos/evento-actividad.jpg';
import charla from '@/assets/fotos/evento-charla.jpg';
import congreso from '@/assets/fotos/evento-congreso.jpg';
import pena from '@/assets/fotos/evento-pena.jpg';
import rural from '@/assets/fotos/evento-rural.jpg';
import visita from '@/assets/fotos/evento-visita.jpg';
import type { Categoria } from '@/lib/tipos';

export const FOTOS_POR_CATEGORIA: Record<Categoria, ImageMetadata> = {
  rural,
  congreso,
  charla,
  visita,
  peña: pena,
  actividad,
};
