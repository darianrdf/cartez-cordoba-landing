// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // URL de producción (se usa para la URL canónica y las URLs absolutas de Open Graph)
  site: 'https://ateneo-cartez-cordoba.pages.dev',
  output: 'static',
  // Build de los tests e2e (scripts/build-e2e.mjs): aparte, para no pisar dist/.
  outDir: process.env.CONTENIDO_E2E ? './dist-e2e' : './dist',
  // El CSS es chico y es una sola página: inlinearlo evita un recurso que bloquea el render.
  build: { inlineStylesheets: 'always' },
  image: {
    // Imágenes remotas: solo los buckets públicos galeria (mesa) y landing (flyers de eventos) de
    // cartez-prod y cartez-dev (Supabase Storage). Se descargan y optimizan en el build: el
    // visitante nunca le pide nada a Supabase.
    // Mantener en sincronía con HOSTS_SUPABASE y BucketPublico de src/lib/contenido.ts.
    remotePatterns: [
      { protocol: 'https', hostname: 'ymxtvtzzkqdngsavuigl.supabase.co', pathname: '/storage/v1/object/public/galeria/**' },
      { protocol: 'https', hostname: 'gaibxlhpjeslqyyfkoho.supabase.co', pathname: '/storage/v1/object/public/galeria/**' },
      { protocol: 'https', hostname: 'ymxtvtzzkqdngsavuigl.supabase.co', pathname: '/storage/v1/object/public/landing/**' },
      { protocol: 'https', hostname: 'gaibxlhpjeslqyyfkoho.supabase.co', pathname: '/storage/v1/object/public/landing/**' },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
