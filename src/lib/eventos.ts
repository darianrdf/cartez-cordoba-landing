import type { Categoria } from '@/lib/tipos';

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Recibe una fecha civil 'YYYY-MM-DD'. */
export function formatearFecha(fecha: string): string {
  return formatoFecha.format(new Date(`${fecha}T00:00:00Z`));
}

export const ETIQUETAS_CATEGORIA: Record<Categoria, string> = {
  rural: 'Rural',
  congreso: 'Congreso',
  charla: 'Charla',
  visita: 'Visita',
  peña: 'Peña',
  actividad: 'Actividad',
};
