import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIAS, ORGANIZADORES } from '@/lib/tipos';

const eventos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventos' }),
  schema: ({ image }) => {
    /** Imagen local (ruta relativa al .md, la optimiza Astro) o URL https (p. ej. Supabase Storage). */
    const imagen = z.union([image(), z.url().startsWith('https://')]);
    return z
      .object({
        // Las fechas YAML llegan como medianoche UTC; src/lib/data.ts las normaliza a fecha civil.
        titulo: z.string(),
        fecha: z.coerce.date(),
        /** Último día del evento. Si falta, es igual a `fecha`. */
        fechaFin: z.coerce.date().optional(),
        lugar: z.string(),
        categoria: z.enum(CATEGORIAS),
        organizador: z.enum(ORGANIZADORES),
        link: z.url().optional(),
        /** Imagen de la tarjeta. Prioridad: imagen → flyer → foto por defecto de la categoría. */
        imagen: imagen.optional(),
        flyer: imagen.optional(),
      })
      .refine(({ fecha, fechaFin }) => !fechaFin || fechaFin >= fecha, {
        message: '`fechaFin` no puede ser anterior a `fecha`',
        path: ['fechaFin'],
      });
  },
});

export const collections = { eventos };
