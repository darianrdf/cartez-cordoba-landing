/**
 * Tipos de dominio. No dependen de la fuente de datos (hoy archivos locales,
 * más adelante Supabase): src/lib/data.ts es quien convierte la fuente a estos tipos.
 */
import type { ImageMetadata } from 'astro';

export const CATEGORIAS = ['rural', 'congreso', 'charla', 'visita', 'peña', 'actividad'] as const;
export const ORGANIZADORES = ['propio', 'externo'] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Organizador = (typeof ORGANIZADORES)[number];

export interface Evento {
  id: string;
  titulo: string;
  /** Fecha civil de inicio, 'YYYY-MM-DD'. */
  fecha: string;
  /** Fecha civil de fin, 'YYYY-MM-DD'. Igual a `fecha` si el evento dura un día. */
  fechaFin: string;
  lugar: string;
  categoria: Categoria;
  organizador: Organizador;
  link?: string;
  /** Imagen local (optimizada por Astro) o URL externa. */
  flyer?: ImageMetadata | string;
  descripcion?: string;
}

export interface Miembro {
  cargo: string;
  nombre: string;
  /** Ruta dentro de public/ o URL externa. Si falta, se muestran las iniciales. */
  foto?: string;
  orden: number;
  destacado: boolean;
}

export interface Comision {
  etapa: string;
  miembros: Miembro[];
}

export interface BloqueTexto {
  titulo: string;
  texto: string;
}

/** Contenido editable del sitio (textos y contactos). */
export interface Sitio {
  nombre: string;
  organizacion: string;
  descripcionMeta: string;
  heroFrase: string;
  /** Cada medio es opcional: si falta, su botón no se muestra. */
  contacto: {
    /** Usuario sin @, ej. "cba.ateneocartez". */
    instagram?: string;
    mail?: string;
    /** Número internacional solo con dígitos, ej. "5492954588587". */
    whatsapp?: string;
    whatsappMensaje?: string;
  };
  conocenos: {
    ateneo: BloqueTexto;
    comision: BloqueTexto;
  };
  objetivos: string[];
}
