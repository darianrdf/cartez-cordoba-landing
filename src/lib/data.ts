/**
 * Capa de acceso a datos. ÚNICO lugar que conoce de dónde salen eventos, comisión y
 * contenido del sitio: Supabase (`contenido_landing()`), leído una sola vez por build en
 * src/lib/contenido.ts, con el snapshot src/data/sitio.json si la lectura falla. Los eventos se
 * cargan en el dashboard (sección Eventos, D-23).
 */
import { readFile } from 'node:fs/promises';
import snapshot from '@/data/sitio.json';
import { contenidoFijo, obtenerContenido, TIMEOUT_POR_DEFECTO_MS, urlStorage, type Contenido } from '@/lib/contenido';
import { esProduccion } from '@/lib/entorno';
import { conFlyersDisponibles } from '@/lib/flyers';
import { convertirEventos, eventosAnteriores, eventosProximos } from '@/lib/eventos';
import { parsearSitio } from '@/lib/sitio';
import type { Comision, Evento, FotoGaleria, Imagen, Sitio } from '@/lib/tipos';
import { secciones, type Seccion } from '@/data/navegacion';

/** Fotos locales disponibles para referenciar por nombre de archivo (hero, franja, etc.). */
const fotosLocales = Object.fromEntries(
  Object.entries(
    import.meta.glob<{ default: ImageMetadata }>('/src/assets/fotos/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
  ).map(([ruta, modulo]) => [ruta.split('/').pop()!, modulo.default]),
);

/**
 * Resuelve una referencia de imagen: las URL quedan como string (imagen remota) y los nombres
 * de archivo se buscan en src/assets/fotos/.
 */
function resolverImagen(referencia: string): Imagen {
  if (/^https:\/\//.test(referencia)) return referencia;
  const foto = fotosLocales[referencia];
  if (!foto) throw new Error(`No existe la imagen "${referencia}" en src/assets/fotos/`);
  return foto;
}

/** Variable de entorno del build: Cloudflare la pasa en process.env; en local, el archivo .env. */
function variable(nombre: string): string | undefined {
  return process.env[nombre] || (import.meta.env[nombre] as string | undefined) || undefined;
}

let contenidoDelBuild: Promise<Contenido> | undefined;

/** Una sola lectura de Supabase por build, aunque cada sección pida su parte. */
function contenido(): Promise<Contenido> {
  // Tests e2e (scripts/build-e2e.mjs): contenido fijo de un archivo, sin leer Supabase.
  const archivoE2E = variable('CONTENIDO_E2E');
  if (archivoE2E) {
    contenidoDelBuild ??= readFile(archivoE2E, 'utf8').then((texto) => contenidoFijo(JSON.parse(texto)));
    return contenidoDelBuild;
  }
  contenidoDelBuild ??= obtenerContenido({
    url: variable('SUPABASE_URL'),
    clave: variable('SUPABASE_ANON_KEY'),
    timeoutMs: Number(variable('CONTENIDO_TIMEOUT_MS')) || TIMEOUT_POR_DEFECTO_MS,
    snapshot,
  });
  return contenidoDelBuild;
}

let eventosDelBuild: Promise<Evento[]> | undefined;

/**
 * Todos los eventos publicados (también los terminados), por fecha. Uno por página /eventos/<slug>/.
 * Los flyers se verifican una sola vez por build: el que no baja se descarta (foto del tipo).
 */
export function getTodosLosEventos(): Promise<Evento[]> {
  eventosDelBuild ??= contenido().then(({ origen, eventos }) => conFlyersDisponibles(convertirEventos(origen, eventos)));
  // Copia: quien la ordene no cambia la de los demás.
  return eventosDelBuild.then((eventos) => [...eventos]);
}

/**
 * Eventos no vencidos (próximos y en curso) en el instante `ahora`, ordenados por fecha de inicio.
 * Se evalúa en el build; el navegador vuelve a filtrar al cargar (ver Eventos.astro).
 */
export async function getEventos(ahora: Date = new Date()): Promise<Evento[]> {
  return eventosProximos(await getTodosLosEventos(), ahora);
}

/** Eventos terminados en el instante `ahora`, del más reciente al más viejo. */
export async function getEventosAnteriores(ahora: Date = new Date()): Promise<Evento[]> {
  return eventosAnteriores(await getTodosLosEventos(), ahora);
}

/** Mesa vigente. La función ya filtra los cargos que se muestran en la landing. */
export async function getComision(): Promise<Comision> {
  const { origen, mesa } = await contenido();
  return {
    etapa: mesa.etapa ?? undefined,
    miembros: mesa.integrantes.map((i) => ({
      cargo: i.cargo,
      nombre: i.nombre,
      foto: i.foto_path ? urlStorage(origen, 'galeria', i.foto_path) : undefined,
      orden: i.orden,
      destacado: true,
    })),
  };
}

/** Textos, contactos e imágenes: la fila `configuracion_sitio`. */
export async function getSitio(): Promise<Sitio> {
  return parsearSitio((await contenido()).configuracion_sitio, resolverImagen);
}

/** Fotos públicas de la galería. Todavía no se muestran (sección de la fase 6b). */
export async function getGaleria(): Promise<FotoGaleria[]> {
  const { origen, galeria } = await contenido();
  return galeria.map((f) => ({
    url: urlStorage(origen, 'galeria', f.path),
    alt: f.alt,
    credito: f.credito ?? undefined,
    ancho: f.ancho ?? undefined,
    alto: f.alto ?? undefined,
    orden: f.orden,
  }));
}

/** Secciones del menú: Comisión solo si hay mesa vigente para mostrar. */
export async function getSecciones(): Promise<readonly Seccion[]> {
  const { mesa } = await contenido();
  return secciones.filter((s) => s.id !== 'comision' || mesa.integrantes.length > 0);
}

/** true solo en el sitio público de producción: fuera de eso, la página sale con noindex. */
export async function esSitioPublico(): Promise<boolean> {
  return esProduccion(variable('CF_PAGES_BRANCH'), (await contenido()).entorno);
}
