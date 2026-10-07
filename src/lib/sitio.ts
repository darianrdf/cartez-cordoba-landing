/**
 * Contenido editable del sitio. Módulo puro (sin Astro): lo usan data.ts y los tests.
 *
 * La "fila" tiene la misma forma plana que tendrá la tabla `configuracion_sitio` de Supabase
 * (una sola fila, columnas en snake_case). Hoy viene de src/data/sitio.json.
 */
import { z } from 'astro/zod';
import type { Sitio } from '@/lib/tipos';

/** Texto opcional: vacío, espacios o null cuentan como "no cargado". */
const opcional = z
  .string()
  .nullish()
  .transform((valor) => valor?.trim() || undefined);

export const filaSitioSchema = z.object({
  nombre: z.string().min(1),
  organizacion: z.string().min(1),
  descripcion_meta: z.string(),
  hero_frase: z.string(),
  instagram: opcional,
  mail: opcional,
  whatsapp: opcional,
  whatsapp_mensaje: opcional,
  conocenos_ateneo_titulo: z.string(),
  conocenos_ateneo_texto: z.string(),
  conocenos_comision_titulo: z.string(),
  conocenos_comision_texto: z.string(),
  objetivos: z.array(z.string()),
});

export type FilaSitio = z.input<typeof filaSitioSchema>;

export function parsearSitio(fila: unknown): Sitio {
  const f = filaSitioSchema.parse(fila);
  return {
    nombre: f.nombre,
    organizacion: f.organizacion,
    descripcionMeta: f.descripcion_meta,
    heroFrase: f.hero_frase,
    contacto: {
      instagram: f.instagram?.replace(/^@/, ''),
      mail: f.mail,
      whatsapp: f.whatsapp?.replace(/\D/g, '') || undefined,
      whatsappMensaje: f.whatsapp_mensaje,
    },
    conocenos: {
      ateneo: { titulo: f.conocenos_ateneo_titulo, texto: f.conocenos_ateneo_texto },
      comision: { titulo: f.conocenos_comision_titulo, texto: f.conocenos_comision_texto },
    },
    objetivos: f.objetivos.map((o) => o.trim()).filter(Boolean),
  };
}

/** "Comisión Córdoba – Ateneo CARTEZ" (alt de los logos). */
export function nombreCompleto(sitio: Sitio): string {
  return `${sitio.nombre} – ${sitio.organizacion}`;
}

export function whatsappUrl(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, '')}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function instagramUrl(usuario: string): string {
  return `https://instagram.com/${usuario.replace(/^@/, '')}`;
}

export function mailtoUrl(mail: string): string {
  return `mailto:${mail}`;
}
