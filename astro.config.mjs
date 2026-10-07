// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // URL de producción (se usa para la URL canónica y las URLs absolutas de Open Graph)
  site: 'https://ateneo-cartez-cordoba.pages.dev',
  output: 'static',
  image: {
    // Imágenes remotas permitidas (hero, franja, eventos y fotos de la comisión vendrán de
    // Supabase Storage). Cuando exista el proyecto, se puede restringir al hostname concreto.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
