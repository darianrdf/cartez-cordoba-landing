import { getCollection, type CollectionEntry } from 'astro:content';

export type Evento = CollectionEntry<'eventos'>;

/** Eventos de hoy en adelante, ordenados por fecha ascendente. Se evalúa al hacer el build. */
export async function getProximosEventos(hoy: Date = new Date()): Promise<Evento[]> {
  const inicioDelDia = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const eventos = await getCollection('eventos', ({ data }) => data.fecha >= inicioDelDia);
  return eventos.sort((a, b) => a.data.fecha.getTime() - b.data.fecha.getTime());
}

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatearFecha(fecha: Date): string {
  return formatoFecha.format(fecha);
}

/** yyyy-mm-dd para el atributo datetime de <time>. */
export function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export const ETIQUETAS_CATEGORIA: Record<Evento['data']['categoria'], string> = {
  rural: 'Rural',
  congreso: 'Congreso',
  charla: 'Charla',
  visita: 'Visita',
  peña: 'Peña',
  actividad: 'Actividad',
};
