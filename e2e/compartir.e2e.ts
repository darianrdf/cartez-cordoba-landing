import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { SITIO_PRODUCCION } from '../src/lib/entorno';

/**
 * «Compartir» y Open Graph de la página de un evento (evento de prueba de scripts/build-e2e.mjs).
 * El build local no tiene CF_PAGES_BRANCH: la URL canónica es la de producción.
 */
const RUTA = '/eventos/jornada-de-gremialismo-agropecuario/';
const URL_EVENTO = `${SITIO_PRODUCCION}${RUTA}`;
const TITULO = 'Jornada de Gremialismo Agropecuario';
const TEXTO = new RegExp(`^${TITULO} · del \\d+ (al|de) .+ · Sociedad Rural de Río Cuarto, Río Cuarto, Córdoba$`);

test.describe('escritorio', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('WhatsApp lleva el texto y el link; Copiar link avisa', async ({ page }) => {
    await page.goto(RUTA);
    await expect(page.getByRole('button', { name: 'Compartir este evento' })).toBeHidden();

    const whatsapp = page.getByRole('link', { name: /Compartir por WhatsApp/ });
    await expect(whatsapp).toBeVisible();
    const href = (await whatsapp.getAttribute('href'))!;
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    const [texto, url] = decodeURIComponent(href.slice('https://wa.me/?text='.length)).split('\n');
    expect(texto).toMatch(TEXTO);
    expect(url).toBe(URL_EVENTO);

    await page.getByRole('button', { name: 'Copiar link del evento' }).click();
    await expect(page.getByRole('status')).toHaveText('¡Link copiado!');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(URL_EVENTO);
    // El aviso se borra solo.
    await expect(page.getByRole('status')).toHaveText('', { timeout: 5000 });
  });
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });

  /** Reemplaza navigator.share: guarda lo que se comparte y responde como `respuesta`. */
  const simularShare = (respuesta: 'ok' | 'AbortError' | 'NotAllowedError') => () =>
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((respuesta) => {
        const w = window as unknown as { compartido: ShareData[] };
        w.compartido = [];
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (datos: ShareData) => {
            w.compartido.push(datos);
            if (respuesta !== 'ok') throw new DOMException('simulado', respuesta);
          },
        });
      }, respuesta);
    });

  test.describe('el menú nativo se abre', () => {
    simularShare('ok')();

    test('con título, texto y link; sin WhatsApp ni Copiar', async ({ page }) => {
      await page.goto(RUTA);
      await expect(page.getByRole('link', { name: /Compartir por WhatsApp/ })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Copiar link del evento' })).toBeHidden();
      await page.getByRole('button', { name: 'Compartir este evento' }).click();
      const [datos] = await page.evaluate(() => (window as unknown as { compartido: ShareData[] }).compartido);
      expect(datos?.title).toBe(TITULO);
      expect(datos?.text).toMatch(TEXTO);
      expect(datos?.url).toBe(URL_EVENTO);
    });
  });

  test.describe('si la persona cierra el menú', () => {
    simularShare('AbortError')();

    test('no aparece ningún error', async ({ page }) => {
      await page.goto(RUTA);
      await page.getByRole('button', { name: 'Compartir este evento' }).click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { compartido: unknown[] }).compartido.length)).toBe(1);
      await expect(page.getByRole('status')).toHaveText('');
      await expect(page.getByRole('link', { name: /Compartir por WhatsApp/ })).toBeHidden();
    });
  });

  test.describe('si el menú nativo falla', () => {
    simularShare('NotAllowedError')();

    test('ofrece WhatsApp y Copiar link', async ({ page }) => {
      await page.goto(RUTA);
      await page.getByRole('button', { name: 'Compartir este evento' }).click();
      await expect(page.getByRole('link', { name: /Compartir por WhatsApp/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Compartir por WhatsApp/ })).toBeFocused();
    });
  });
});

test('Open Graph completo para la vista previa de WhatsApp', async ({ page, request }) => {
  await page.goto(RUTA);
  const meta = (propiedad: string) => page.locator(`meta[property="${propiedad}"]`).getAttribute('content');

  expect(await meta('og:title')).toContain(TITULO);
  expect(await meta('og:description')).toMatch(/^Jornada de formación para jóvenes dirigentes rurales/);
  expect(await meta('og:url')).toBe(URL_EVENTO);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(URL_EVENTO);
  expect(await meta('og:image:width')).toBe('1200');
  expect(await meta('og:image:height')).toBe('630');

  const imagen = new URL((await meta('og:image'))!);
  expect(imagen.origin).toBe(SITIO_PRODUCCION);
  // La misma imagen, pedida al preview local.
  const respuesta = await request.get(imagen.pathname);
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()['content-type']).toBe('image/jpeg');
  const { width, height } = await sharp(await respuesta.body()).metadata();
  expect([width, height]).toEqual([1200, 630]);
});

test('evento con flyer que no baja: foto del tipo en la tarjeta, el detalle y Open Graph', async ({ page, request }) => {
  const ruta = '/eventos/visita-con-flyer-roto/';
  await page.goto(ruta);
  // Detalle: sin flyer (su alt sería "Flyer de …"), con la foto del tipo.
  await expect(page.getByRole('img', { name: /^Flyer de/ })).toHaveCount(0);
  await expect(page.locator('article img').first()).toHaveAttribute('src', /evento-visita/);

  // Open Graph: la foto del tipo en 1200×630, no og.jpg (que no se generó).
  const imagen = new URL((await page.locator('meta[property="og:image"]').getAttribute('content'))!);
  expect(imagen.pathname).not.toMatch(/og\.jpg$/);
  const respuesta = await request.get(imagen.pathname);
  expect(respuesta.status()).toBe(200);
  const { width, height } = await sharp(await respuesta.body()).metadata();
  expect([width, height]).toEqual([1200, 630]);
  expect((await request.get(`${ruta}og.jpg`)).status()).toBe(404);

  // Tarjeta en la home, con su foto.
  await page.goto('/');
  const tarjeta = page.locator(`[data-evento]:has(a[href="${ruta}"])`);
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.locator('img')).toHaveAttribute('src', /evento-visita/);
});
