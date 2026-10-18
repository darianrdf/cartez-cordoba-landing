/**
 * Tipos de dominio. No dependen de la fuente de datos (hoy Supabase, con un snapshot de
 * respaldo): src/lib/data.ts es quien convierte la fuente a estos tipos.
 */
import type { ImageMetadata } from 'astro';

export const CATEGORIAS = ['rural', 'congreso', 'charla', 'visita', 'peña', 'actividad'] as const;
export const ORGANIZADORES = ['propio', 'externo'] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Organizador = (typeof ORGANIZADORES)[number];

/** Imagen local (ImageMetadata, optimizada por Astro) o URL externa (p. ej. Supabase Storage). */
export type Imagen = ImageMetadata | string;

export const FORMATOS = ['presencial', 'virtual', 'hibrido'] as const;
export const COSTOS = ['gratuito', 'pago', 'a_confirmar'] as const;

export type Formato = (typeof FORMATOS)[number];
export type Costo = (typeof COSTOS)[number];

/** Un bloque del programa (agenda) de un evento. */
export interface BloquePrograma {
  /** 'HH:MM'. */
  hora?: string;
  titulo: string;
  oradores: string[];
  moderador?: string;
}

export interface Evento {
  id: string;
  /** URL de su página: /eventos/<slug>/. */
  slug: string;
  titulo: string;
  /** Fecha civil de inicio, 'YYYY-MM-DD'. */
  fecha: string;
  /** Fecha civil de fin, 'YYYY-MM-DD'. Igual a `fecha` si el evento dura un día. */
  fechaFin: string;
  /** 'HH:MM'. */
  horaInicio?: string;
  horaFin?: string;
  lugar: string;
  /** Evento más grande del que forma parte (ej. "ArgenCarne Río Cuarto 2026"). */
  marco?: string;
  /** Tipo de evento tal como se muestra (ej. "Jornada"). */
  tipo: string;
  /** Qué foto por defecto usa si no hay flyer (src/lib/fotos.ts). */
  categoria: Categoria;
  /** Nombre de quien organiza. */
  organizadorNombre?: string;
  /** Lo organiza la Comisión: la tarjeta se destaca. */
  organizaComision: boolean;
  /** Instituciones que acompañan. */
  acompanan: string[];
  /** La Comisión participa o asiste (aunque organice otro). */
  comisionParticipa: boolean;
  formato: Formato;
  linkTransmision?: string;
  /** Link de inscripción. */
  link?: string;
  costo?: Costo;
  costoMonto?: string;
  /** Descripción corta (tarjeta). */
  descripcion?: string;
  /** Descripción larga (página del evento), con saltos de línea. */
  descripcionLarga?: string;
  /** Imagen de la tarjeta. Si falta, se usa el flyer y, si tampoco hay, la foto por defecto de la categoría. */
  imagen?: Imagen;
  flyer?: Imagen;
  programa: BloquePrograma[];
}

export interface Miembro {
  cargo: string;
  nombre: string;
  /** URL de Supabase Storage (se optimiza en el build). Si falta, se muestran las iniciales. */
  foto?: string;
  orden: number;
  destacado: boolean;
}

export interface Comision {
  /** Etapa de la mesa vigente (ej. "2026"). Falta si no hay mesa vigente. */
  etapa?: string;
  miembros: Miembro[];
}

/** Foto pública de la galería (fase 6b: todavía no se muestra). */
export interface FotoGaleria {
  url: string;
  alt: string;
  credito?: string;
  ancho?: number;
  alto?: number;
  orden: number;
}

export interface BloqueTexto {
  titulo: string;
  parrafos: string[];
  /** Frase destacada al final del bloque (se muestra como cita). */
  destacado?: string;
}

export interface Objetivo {
  titulo: string;
  descripcion: string;
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
  objetivos: Objetivo[];
  /** Invitación a sumarse (sección Contacto), en párrafos. */
  sumate: string[];
  /** Mensaje del estado vacío de Eventos. */
  eventosVacio: string;
  imagenes: {
    heroEscritorio: Imagen;
    heroCelular: Imagen;
    franja: Imagen;
  };
  franjaFrase: string;
}
