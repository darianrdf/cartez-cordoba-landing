// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // URL de producción (se usa para la URL canónica y las URLs absolutas de Open Graph)
  site: 'https://ateneo-cartez-cordoba.pages.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
