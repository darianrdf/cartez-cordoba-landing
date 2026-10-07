import type { Categoria, Evento, Imagen } from '@/lib/tipos';

export const ETIQUETAS_CATEGORIA: Record<Categoria, string> = {
  rural: 'Rural',
  congreso: 'Congreso',
  charla: 'Charla',
  visita: 'Visita',
  peña: 'Peña',
  actividad: 'Actividad',
};

/**
 * Imagen de la tarjeta de un evento. Prioridad: `imagen` → `flyer` → foto por defecto de la
 * categoría (las fotos por defecto se definen en src/lib/fotos.ts).
 */
export function imagenDeEvento<T extends Imagen>(
  evento: Pick<Evento, 'imagen' | 'flyer' | 'categoria'>,
  porDefecto: Record<Categoria, T>,
): Imagen {
  return evento.imagen ?? evento.flyer ?? porDefecto[evento.categoria];
}
