/**
 * /eventos/<slug>/og.jpg: imagen para compartir de los eventos con flyer, que va entero sobre
 * fondo navy en 1200×630 (ver src/lib/og.ts). Solo se genera si se pudo armar: si falla, la página
 * usa la foto del tipo (mismo resultado, ogDeFlyerDelBuild) y el build sigue. Los eventos sin
 * flyer usan la foto del tipo recortada con astro:assets (en [slug].astro).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { COLORES } from '@/lib/contraste';
import { getTodosLosEventos } from '@/lib/data';
import { ogDeFlyerDelBuild } from '@/lib/og';

export const getStaticPaths = (async () => {
  const eventos = await getTodosLosEventos();
  const paginas = await Promise.all(
    eventos.map(async (evento) => {
      if (typeof evento.flyer !== 'string') return [];
      const imagen = await ogDeFlyerDelBuild(evento.flyer, COLORES.navy);
      return imagen ? [{ params: { slug: evento.slug }, props: { imagen } }] : [];
    }),
  );
  return paginas.flat();
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(new Uint8Array(props.imagen as Buffer), { headers: { 'Content-Type': 'image/jpeg' } });
