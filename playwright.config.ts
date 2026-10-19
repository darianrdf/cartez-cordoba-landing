import { defineConfig, devices } from '@playwright/test';

/**
 * Tests en un navegador real contra el build (`npm run build` antes). Usa el Google Chrome
 * instalado (`channel: 'chrome'`): no hace falta descargar el Chromium de Playwright.
 * Los `.e2e.ts` no los toma Vitest.
 */
const PUERTO = 4322;

const celular = (ancho: number) => ({
  name: `celular-${ancho}`,
  testMatch: 'desborde.e2e.ts',
  use: {
    channel: 'chrome',
    viewport: { width: ancho, height: 800 },
    // Sin isMobile, Chrome no reproduce el "zoom hacia afuera" que hace el celular cuando algo se pasa de ancho.
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
});

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: 'test-results',
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    // .aparecer arranca invisible: con movimiento reducido el contenido se ve directamente.
    reducedMotion: 'reduce',
  },
  projects: [
    celular(360),
    celular(390),
    celular(414),
    { name: 'compartir', testMatch: 'compartir.e2e.ts', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PUERTO}`,
    url: `http://127.0.0.1:${PUERTO}`,
    // Mismo valor que usa scripts/build-e2e.mjs: así preview sirve dist-e2e/.
    env: { CONTENIDO_E2E: '.e2e/contenido.json' },
    reuseExistingServer: false,
  },
});
