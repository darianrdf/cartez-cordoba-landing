/**
 * Contenido que la mesa edita en el dashboard, leído de Supabase EN EL BUILD (nunca desde el
 * navegador del visitante). Módulo puro (sin Astro): lo usan data.ts, scripts/snapshot.mjs y los tests.
 *
 * - Fuente: `public.contenido_landing()` de Supabase, la única función que la clave pública
 *   (anon) puede ejecutar. Contrato `version` 1 (ver dashboard-cartez, D-20).
 * - Si la lectura falla, tarda más de `timeoutMs` o la respuesta no valida, se usa el snapshot
 *   versionado (src/data/sitio.json) y se deja un aviso en el log: el build nunca se rompe por esto.
 * - La función devuelve rutas de Storage (`foto_path`), no URLs: la URL se arma con `origen`,
 *   que el snapshot también guarda.
 */
import { z } from 'astro/zod';
import { filaSitioSchema } from './sitio';

/** Proyectos de Supabase de los que se acepta contenido (cartez-prod y cartez-dev). */
export const HOSTS_SUPABASE = ['ymxtvtzzkqdngsavuigl.supabase.co', 'gaibxlhpjeslqyyfkoho.supabase.co'] as const;

/** Espera máxima de la lectura en el build. */
export const TIMEOUT_POR_DEFECTO_MS = 10_000;

/** Ruta dentro de un bucket: la misma regla que el check de la base. */
const rutaStorage = z.string().regex(/^[A-Za-z0-9/_.-]+\.(webp|jpe?g|png)$/);

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
});

export type Contenido = z.output<typeof contenidoSchema>;

/** URL pública de un archivo del bucket galeria del proyecto `origen`. */
export function urlStorage(origen: string, ruta: string): string {
  return `${origen}/storage/v1/object/public/galeria/${ruta}`;
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
  const snapshot = contenidoSchema.parse(opciones.snapshot);

  const usarSnapshot = (motivo: string): Contenido => {
    log.warn(
      `[contenido] ⚠ No se pudo leer Supabase (${motivo}). Se usa el snapshot del ${snapshot.generado_en} (${snapshot.entorno}).`,
    );
    return snapshot;
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
    const vivo = resultado.data;
    const comparacion =
      vivo.entorno !== snapshot.entorno
        ? `snapshot de ${snapshot.entorno}, no se compara`
        : mismoContenido(vivo, snapshot)
          ? 'snapshot al día'
          : '⚠ el snapshot versionado difiere: corré npm run snapshot y commitealo';
    log.info(
      `[contenido] Supabase OK (${vivo.entorno}): ${vivo.mesa.integrantes.length} integrantes de la mesa, ` +
        `${vivo.galeria.length} fotos · ${comparacion}`,
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
