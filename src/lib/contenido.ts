/**
 * Contenido que la mesa edita en el dashboard, leído de Supabase EN EL BUILD (nunca desde el
 * navegador del visitante). Módulo puro (sin Astro): lo usan data.ts, scripts/snapshot.mjs y los tests.
 *
 * - Fuente: `public.contenido_landing()` de Supabase, la única función que la clave pública
 *   (anon) puede ejecutar. Contrato `version` 1 (ver dashboard-cartez, D-20 y D-23).
 * - Si la lectura falla, tarda más de `timeoutMs` o la respuesta no valida, se usa el snapshot
 *   versionado (src/data/sitio.json) y se deja un aviso en el log: el build nunca se rompe por esto.
 * - La función devuelve rutas de Storage (`foto_path`, `flyer_path`), no URLs: la URL se arma con
 *   `origen`, que el snapshot también guarda.
 * - Los eventos se validan uno por uno: uno inválido se descarta con un aviso y el resto se usa.
 *   Solo si falta la lista entera (o no es una lista) se cae al snapshot.
 */
import { z } from 'astro/zod';
import { filaSitioSchema } from './sitio';
import { CATEGORIAS, COSTOS, FORMATOS, ORGANIZADORES } from './tipos';

/** Proyectos de Supabase de los que se acepta contenido (cartez-prod y cartez-dev). */
export const HOSTS_SUPABASE = ['ymxtvtzzkqdngsavuigl.supabase.co', 'gaibxlhpjeslqyyfkoho.supabase.co'] as const;

/** Espera máxima de la lectura en el build. */
export const TIMEOUT_POR_DEFECTO_MS = 10_000;

/** Ruta dentro de un bucket: la misma regla que el check de la base. */
const rutaStorage = z.string().regex(/^[A-Za-z0-9/_.-]+\.(webp|jpe?g|png)$/);

/** Flyer de un evento: WebP dentro de eventos/ del bucket landing (la misma regla que la base). */
const rutaFlyer = z.string().regex(/^eventos\/([A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.webp$/);

const fechaCivil = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const origenSchema = z.string().refine((url) => {
  if (!URL.canParse(url)) return false;
  const u = new URL(url);
  return u.protocol === 'https:' && (HOSTS_SUPABASE as readonly string[]).includes(u.host) && url === u.origin;
}, 'Se espera la URL de cartez-prod o cartez-dev, sin barra final');

const integranteSchema = z.object({
  nombre: z.string().trim().min(1),
  cargo: z.string().trim().min(1),
  orden: z.number().int(),
  foto_path: rutaStorage.nullable(),
});

const fotoGaleriaSchema = z.object({
  path: rutaStorage,
  alt: z.string().trim().min(1),
  credito: z.string().nullable(),
  ancho: z.number().int().positive().nullable(),
  alto: z.number().int().positive().nullable(),
  orden: z.number().int(),
});

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const texto = z.string().trim().min(1);

const bloqueSchema = z.object({
  hora: hora.nullable(),
  titulo: texto,
  oradores: z.array(texto),
  moderador: texto.nullable(),
});

/**
 * Un evento publicado (D-23 y D-24). Se valida por separado (ver eventosValidos). Incluye los ya
 * terminados: la landing los muestra en "Eventos anteriores".
 */
export const eventoSchema = z
  .object({
    id: z.uuid(),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    titulo: texto,
    fecha: fechaCivil,
    /** Igual a fecha si dura un día (nunca null en el contrato). */
    fecha_fin: fechaCivil,
    hora_inicio: hora.nullable(),
    hora_fin: hora.nullable(),
    lugar: texto,
    marco: texto.nullable(),
    /** La foto por defecto del tipo. */
    categoria: z.enum(CATEGORIAS),
    tipo: texto,
    organizador: z.enum(ORGANIZADORES),
    organizador_nombre: texto.nullable(),
    organiza_comision: z.boolean(),
    acompanan: z.array(texto),
    comision_participa: z.boolean(),
    formato: z.enum(FORMATOS),
    link_transmision: z.url().nullable(),
    link: z.url().nullable(),
    costo: z.enum(COSTOS).nullable(),
    costo_monto: texto.nullable(),
    /** La descripción corta. */
    descripcion: z.string().nullable(),
    descripcion_larga: z.string().nullable(),
    flyer_path: rutaFlyer.nullable(),
    programa: z.array(bloqueSchema),
  })
  .refine((e) => e.fecha_fin >= e.fecha, { message: 'fecha_fin es anterior a fecha', path: ['fecha_fin'] });

export type FilaEvento = z.output<typeof eventoSchema>;

/** Lo que devuelve contenido_landing() más `origen`. Las claves de más se descartan. */
export const contenidoSchema = z.object({
  origen: origenSchema,
  version: z.literal(1),
  generado_en: z.string(),
  entorno: z.enum(['dev', 'prod']),
  configuracion_sitio: filaSitioSchema,
  galeria: z.array(fotoGaleriaSchema),
  mesa: z.object({
    etapa: z.string().nullable(),
    integrantes: z.array(integranteSchema),
  }),
  /** Cada uno se valida después, por separado: acá solo se exige que sea una lista. */
  eventos: z.array(z.unknown()),
});

export type Contenido = Omit<z.output<typeof contenidoSchema>, 'eventos'> & { eventos: FilaEvento[] };

/** Valida cada evento: uno inválido se descarta con un aviso en el log y el resto sigue. */
export function eventosValidos(filas: readonly unknown[], log: Pick<Console, 'warn'>): FilaEvento[] {
  return filas.flatMap((fila) => {
    const resultado = eventoSchema.safeParse(fila);
    if (resultado.success) return [resultado.data];
    const id = fila && typeof fila === 'object' && 'id' in fila ? String(fila.id) : '(sin id)';
    const problema = resultado.error.issues[0];
    log.warn(`[contenido] evento descartado: ${id} (${problema?.path.join('.') || 'evento'}: ${problema?.message})`);
    return [];
  });
}

function conEventosValidos(crudo: z.output<typeof contenidoSchema>, log: Pick<Console, 'warn'>): Contenido {
  return { ...crudo, eventos: eventosValidos(crudo.eventos, log) };
}

/** Contenido fijo (tests e2e): se valida igual que el de Supabase, sin leer la red. */
export function contenidoFijo(crudo: unknown, log: Pick<Console, 'warn'> = console): Contenido {
  return conEventosValidos(contenidoSchema.parse(crudo), log);
}

/** Buckets públicos de los que la landing toma imágenes (ver image.remotePatterns). */
export type BucketPublico = 'galeria' | 'landing';

/** URL pública de un archivo de un bucket público del proyecto `origen`. */
export function urlStorage(origen: string, bucket: BucketPublico, ruta: string): string {
  return `${origen}/storage/v1/object/public/${bucket}/${ruta}`;
}

/** Mismo contenido, sin contar cuándo se generó. */
export function mismoContenido(a: Contenido, b: Contenido): boolean {
  const sinFecha = ({ generado_en: _, ...resto }: Contenido) => JSON.stringify(resto);
  return sinFecha(a) === sinFecha(b);
}

export interface OpcionesContenido {
  /** SUPABASE_URL del entorno (Cloudflare o .env). */
  url?: string;
  /** SUPABASE_ANON_KEY: la clave pública del proyecto. */
  clave?: string;
  timeoutMs?: number;
  /** El snapshot versionado (src/data/sitio.json). */
  snapshot: unknown;
  fetch?: typeof fetch;
  log?: Pick<Console, 'info' | 'warn'>;
}

/** Lee el contenido de Supabase o, si no se puede, devuelve el snapshot. Nunca lanza por la red. */
export async function obtenerContenido(opciones: OpcionesContenido): Promise<Contenido> {
  const { url, clave, timeoutMs = TIMEOUT_POR_DEFECTO_MS, fetch: f = fetch, log = console } = opciones;
  // Un snapshot versionado inválido es un error de código: lo atajan los tests (sitio.test.ts).
  const snapshotCrudo = contenidoSchema.parse(opciones.snapshot);

  const usarSnapshot = (motivo: string): Contenido => {
    log.warn(
      `[contenido] ⚠ No se pudo leer Supabase (${motivo}). Se usa el snapshot del ${snapshotCrudo.generado_en} (${snapshotCrudo.entorno}).`,
    );
    return conEventosValidos(snapshotCrudo, log);
  };

  if (!url?.trim() || !clave?.trim()) return usarSnapshot('faltan SUPABASE_URL o SUPABASE_ANON_KEY');
  let origen: string;
  try {
    origen = new URL(url.trim()).origin;
  } catch {
    return usarSnapshot('SUPABASE_URL no es una URL');
  }
  if (!(HOSTS_SUPABASE as readonly string[]).includes(new URL(origen).host)) {
    return usarSnapshot(`SUPABASE_URL apunta a un proyecto no permitido: ${new URL(origen).host}`);
  }

  try {
    const respuesta = await f(`${origen}/rest/v1/rpc/contenido_landing`, {
      method: 'POST',
      // Solo apikey: entra como anon con la clave JWT y con la publishable (sb_publishable_…).
      headers: { apikey: clave.trim(), 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!respuesta.ok) return usarSnapshot(`la API respondió ${respuesta.status}`);
    // Leer el cuerpo puede cortarse por el timeout: eso sigue al catch de abajo.
    const texto = await respuesta.text();
    let cuerpo: unknown;
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      return usarSnapshot('la respuesta no es JSON');
    }
    const resultado = contenidoSchema.safeParse({ ...(cuerpo as object), origen });
    if (!resultado.success) {
      const problema = resultado.error.issues[0];
      return usarSnapshot(`respuesta inválida en ${problema?.path.join('.') || 'la raíz'}: ${problema?.message}`);
    }
    const vivo = conEventosValidos(resultado.data, log);
    const comparacion =
      vivo.entorno !== snapshotCrudo.entorno
        ? `snapshot de ${snapshotCrudo.entorno}, no se compara`
        : mismoContenido(vivo, conEventosValidos(snapshotCrudo, { warn: () => undefined }))
          ? 'snapshot al día'
          : '⚠ el snapshot versionado difiere: corré npm run snapshot y commitealo';
    log.info(
      `[contenido] Supabase OK (${vivo.entorno}): ${vivo.mesa.integrantes.length} integrantes de la mesa, ` +
        `${vivo.galeria.length} fotos, ${vivo.eventos.length} eventos · ${comparacion}`,
    );
    return vivo;
  } catch (error) {
    const nombre = error instanceof Error ? error.name : '';
    if (nombre === 'TimeoutError' || nombre === 'AbortError') {
      return usarSnapshot(`no respondió en ${timeoutMs / 1000} s`);
    }
    return usarSnapshot(`error de red: ${error instanceof Error ? error.message : String(error)}`);
  }
}
