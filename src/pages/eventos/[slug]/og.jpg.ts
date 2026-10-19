/**
 * /eventos/<slug>/og.jpg: imagen para compartir de los eventos con flyer, que va entero sobre
 * fondo navy en 1200×630 (ver src/lib/og.ts). Los eventos sin flyer usan la foto del tipo
 * recortada con astro:assets (en [slug].astro).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { COLORES } from '@/lib/contraste';
import { getTodosLosEventos } from '@/lib/data';
import { ogSinRecortar } from '@/lib/og';

export const getStaticPaths = (async () => {
  const eventos = await getTodosLosEventos();
  return eventos.flatMap((evento) =>
    typeof evento.flyer === 'string' ? [{ params: { slug: evento.slug }, props: { flyer: evento.flyer } }] : [],
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const respuesta = await fetch(props.flyer as string);
  if (!respuesta.ok) throw new Error(`[og] No se pudo bajar el flyer ${props.flyer} (${respuesta.status})`);
  const imagen = await ogSinRecortar(await respuesta.arrayBuffer(), COLORES.navy);
  return new Response(new Uint8Array(imagen), { headers: { 'Content-Type': 'image/jpeg' } });
};
