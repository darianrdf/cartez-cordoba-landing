import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIAS, ORGANIZADORES } from '@/lib/tipos';

const eventos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventos' }),
  schema: ({ image }) =>
    z
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
        flyer: image().optional(),
      })
      .refine(({ fecha, fechaFin }) => !fechaFin || fechaFin >= fecha, {
        message: '`fechaFin` no puede ser anterior a `fecha`',
        path: ['fechaFin'],
      }),
});

export const collections = { eventos };
