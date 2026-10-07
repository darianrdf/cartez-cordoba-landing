/**
 * Capa de acceso a datos. ÚNICO lugar que conoce de dónde salen los eventos y la comisión.
 * Hoy: Content Collection de Astro (src/content/eventos) y src/data/comision.json.
 * Cuando la fuente pase a Supabase, solo cambia este archivo.
 */
import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import comisionJson from '@/data/comision.json';
import type { Comision, Evento } from '@/lib/tipos';

const hoyUTC = (ahora: Date) => new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

/** Eventos de hoy en adelante, ordenados por fecha de inicio. */
export async function getEventos(ahora: Date = new Date()): Promise<Evento[]> {
  const desde = hoyUTC(ahora);
  const entradas = await getCollection('eventos', ({ data }) => data.fecha >= desde);

  return entradas
    .map(({ id, data, body }) => ({
      id,
      titulo: data.titulo,
      fecha: data.fecha.toISOString().slice(0, 10),
      fechaFin: data.fecha.toISOString().slice(0, 10),
      lugar: data.lugar,
      categoria: data.categoria,
      organizador: data.organizador,
      link: data.link,
      flyer: data.flyer,
      descripcion: body?.trim() || undefined,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const comisionSchema = z.object({
  etapa: z.string(),
  miembros: z.array(
    z.object({
      cargo: z.string(),
      nombre: z.string(),
      foto: z
        .string()
        .nullish()
        .transform((foto) => foto?.trim() || undefined),
      orden: z.number().int(),
      destacado: z.boolean(),
    }),
  ),
});

export async function getComision(): Promise<Comision> {
  return comisionSchema.parse(comisionJson);
}
