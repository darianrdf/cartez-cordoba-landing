import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIAS, ORGANIZADORES } from '@/lib/tipos';

const eventos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      fecha: z.coerce.date(),
      lugar: z.string(),
      categoria: z.enum(CATEGORIAS),
      organizador: z.enum(ORGANIZADORES),
      link: z.url().optional(),
      flyer: image().optional(),
    }),
});

export const collections = { eventos };
