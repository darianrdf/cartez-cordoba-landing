// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // TODO: reemplazar por el dominio definitivo (se usa para las URLs absolutas de Open Graph)
  site: 'https://comisioncordoba.example.com',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
