/**
 * Contenido editable del sitio. Módulo puro (sin Astro): lo usan data.ts y los tests.
 *
 * La "fila" tiene la misma forma plana que tendrá la tabla `configuracion_sitio` de Supabase
 * (una sola fila, columnas en snake_case). Hoy viene de src/data/sitio.json.
 */
import { z } from 'astro/zod';
import type { Imagen, Sitio } from '@/lib/tipos';

/** Texto opcional: vacío, espacios o null cuentan como "no cargado". */
const opcional = z
  .string()
  .nullish()
  .transform((valor) => valor?.trim() || undefined);

/**
 * Referencia a una imagen: nombre de archivo de src/assets/fotos/ ("hero.jpg") o URL https
 * (p. ej. Supabase Storage).
 */
const referenciaImagen = z
  .string()
  .trim()
  .refine((ref) => /^https:\/\/\S+$/.test(ref) || /^[\w.-]+\.(jpe?g|png|webp|avif)$/i.test(ref), {
    message: 'Se espera un nombre de archivo de src/assets/fotos/ o una URL https',
  });

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
  /** Párrafos separados por una línea en blanco. */
  conocenos_ateneo_texto: z.string(),
  conocenos_ateneo_destacado: opcional,
  conocenos_comision_titulo: z.string(),
  conocenos_comision_texto: z.string(),
  conocenos_comision_destacado: opcional,
  /** Invitación a sumarse: párrafos separados por una línea en blanco. */
  sumate_texto: z.string(),
  eventos_vacio_texto: z.string(),
  objetivos: z.array(
    z.object({
      titulo: z.string().trim(),
      descripcion: z.string().trim(),
    }),
  ),
  hero_imagen_escritorio: referenciaImagen,
  hero_imagen_celular: referenciaImagen,
  franja_imagen: referenciaImagen,
  franja_frase: z.string(),
});

export type FilaSitio = z.input<typeof filaSitioSchema>;

/** Convierte una referencia (archivo o URL) en la imagen que usan los componentes. */
export type ResolverImagen = (referencia: string) => Imagen;

export function parsearSitio(fila: unknown, resolverImagen: ResolverImagen): Sitio {
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
      ateneo: {
        titulo: f.conocenos_ateneo_titulo,
        parrafos: parrafos(f.conocenos_ateneo_texto),
        destacado: f.conocenos_ateneo_destacado,
      },
      comision: {
        titulo: f.conocenos_comision_titulo,
        parrafos: parrafos(f.conocenos_comision_texto),
        destacado: f.conocenos_comision_destacado,
      },
    },
    // Un objetivo sin título no se muestra.
    objetivos: f.objetivos.filter((o) => o.titulo),
    sumate: parrafos(f.sumate_texto),
    eventosVacio: f.eventos_vacio_texto.trim(),
    imagenes: {
      heroEscritorio: resolverImagen(f.hero_imagen_escritorio),
      heroCelular: resolverImagen(f.hero_imagen_celular),
      franja: resolverImagen(f.franja_imagen),
    },
    franjaFrase: f.franja_frase.trim(),
  };
}

/**
 * Divide un texto en párrafos por líneas en blanco (como un textarea del dashboard).
 * Los saltos de línea simples dentro de un párrafo se unen con un espacio.
 */
export function parrafos(texto: string): string[] {
  return texto
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);
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
