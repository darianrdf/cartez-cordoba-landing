import { readdirSync } from 'node:fs';

/** Páginas del build: la home, Eventos anteriores y una por evento (leídas de dist-e2e/, el build de scripts/build-e2e.mjs). */
export function paginasDelBuild(): { nombre: string; ruta: string }[] {
  const eventos = readdirSync(new URL('../dist-e2e/eventos/', import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'anteriores')
    .map((d) => ({ nombre: `evento-${d.name}`, ruta: `/eventos/${d.name}/` }));
  return [{ nombre: 'home', ruta: '/' }, { nombre: 'anteriores', ruta: '/eventos/anteriores/' }, ...eventos];
}
