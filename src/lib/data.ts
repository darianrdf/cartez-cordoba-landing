/**
 * Capa de acceso a datos. ÚNICO lugar que conoce de dónde salen los eventos y la comisión.
 * Hoy: Content Collection de Astro (src/content/eventos) y src/data/comision.json.
 * Cuando la fuente pase a Supabase, solo cambia este archivo.
 */
import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import comisionJson from '@/data/comision.json';
import { estadoEvento, normalizarFecha } from '@/lib/fechas';
import type { Comision, Evento } from '@/lib/tipos';

/**
 * Eventos no vencidos (próximos y en curso) en el instante `ahora`, ordenados por fecha de inicio.
 * Se evalúa en el build; el navegador vuelve a filtrar al cargar (ver Eventos.astro).
 */
export async function getEventos(ahora: Date = new Date()): Promise<Evento[]> {
  const entradas = await getCollection('eventos');

  return entradas
    .map(({ id, data, body }): Evento => ({
      id,
      titulo: data.titulo,
      fecha: normalizarFecha(data.fecha),
      fechaFin: normalizarFecha(data.fechaFin ?? data.fecha),
      lugar: data.lugar,
      categoria: data.categoria,
      organizador: data.organizador,
      link: data.link,
      flyer: data.flyer,
      descripcion: body?.trim() || undefined,
    }))
    .filter((evento) => estadoEvento(evento, ahora) !== 'vencido')
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.fechaFin.localeCompare(b.fechaFin));
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
