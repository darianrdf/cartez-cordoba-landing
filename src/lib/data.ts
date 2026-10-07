/**
 * Capa de acceso a datos. ÚNICO lugar que conoce de dónde salen eventos, comisión y
 * contenido del sitio.
 * Hoy: Content Collection de Astro (src/content/eventos), src/data/comision.json y
 * src/data/sitio.json. Cuando la fuente pase a Supabase, solo cambia este archivo.
 */
import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import comisionJson from '@/data/comision.json';
import sitioJson from '@/data/sitio.json';
import { estadoEvento, normalizarFecha } from '@/lib/fechas';
import { parsearSitio } from '@/lib/sitio';
import type { Comision, Evento, Imagen, Sitio } from '@/lib/tipos';

/** Fotos locales disponibles para referenciar por nombre de archivo (hero, franja, etc.). */
const fotosLocales = Object.fromEntries(
  Object.entries(
    import.meta.glob<{ default: ImageMetadata }>('/src/assets/fotos/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
  ).map(([ruta, modulo]) => [ruta.split('/').pop()!, modulo.default]),
);

/**
 * Resuelve una referencia de imagen: las URL quedan como string (imagen remota) y los nombres
 * de archivo se buscan en src/assets/fotos/. Con Supabase, las imágenes serán URLs de Storage.
 */
function resolverImagen(referencia: string): Imagen {
  if (/^https:\/\//.test(referencia)) return referencia;
  const foto = fotosLocales[referencia];
  if (!foto) throw new Error(`No existe la imagen "${referencia}" en src/assets/fotos/`);
  return foto;
}

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
      imagen: data.imagen,
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

/** Textos y contactos. Con Supabase: la única fila de `configuracion_sitio`. */
export async function getSitio(): Promise<Sitio> {
  return parsearSitio(sitioJson, resolverImagen);
}
