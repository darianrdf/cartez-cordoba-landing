import { expect, test, type Page } from '@playwright/test';
import { paginasDelBuild } from './paginas';

/**
 * Ningún elemento puede ser más ancho que la pantalla del celular: si pasa, el celular achica
 * toda la página y aparece una franja blanca a la derecha.
 */

/** Anula la red de seguridad (overflow-x: clip): con ella el scrollWidth da bien aunque haya desborde. */
async function sinRedDeSeguridad(page: Page) {
  await page.addStyleTag({ content: 'html, body { overflow-x: visible !important; }' });
}

/** Ancho total de la página y los elementos "hoja" que se pasan del ancho (para encontrar la causa). */
async function medir(page: Page, ancho: number) {
  return page.evaluate((ancho) => {
    // Borde derecho de la caja o de su contenido (un texto sin corte se sale de su caja sin agrandarla).
    const derecha = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.left + Math.max(r.width, el.scrollWidth);
    };
    const sePasa = (el: Element) => derecha(el) > ancho + 1;
    const culpables = [...document.querySelectorAll('body *')]
      .filter((el) => sePasa(el) && el.getClientRects().length > 0 && ![...el.children].some(sePasa))
      .slice(0, 5)
      .map((el) => {
        const clases = typeof el.className === 'string' ? el.className.slice(0, 80) : '';
        const texto = (el.textContent ?? '').trim().slice(0, 40);
        return `<${el.tagName.toLowerCase()} class="${clases}"> "${texto}" → ${Math.round(derecha(el))} px`;
      });
    return { scrollWidth: document.documentElement.scrollWidth, culpables };
  }, ancho);
}

async function esperarSinDesborde(page: Page) {
  const ancho = page.viewportSize()!.width;
  const { scrollWidth, culpables } = await medir(page, ancho);
  expect(scrollWidth, `la página mide ${scrollWidth} px en una pantalla de ${ancho} px:\n${culpables.join('\n')}`).toBeLessThanOrEqual(ancho);
}

const LARGO = 'Predio Ferial de la Sociedad Rural de Jesús María y Colonia Caroya';
const SIN_ESPACIOS = 'SociedadRuralDeJesúsMaríaYColoniaCaroyaPredioFerialPabellónCentral';

for (const { nombre, ruta } of paginasDelBuild()) {
  test.describe(nombre, () => {
    test('no se pasa del ancho de la pantalla', async ({ page }, info) => {
      await page.goto(ruta, { waitUntil: 'networkidle' });
      const ancho = page.viewportSize()!.width;
      // Las fotos son lazy: se cargan todas para que salgan en la captura de página completa.
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = 'eager';
        await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
      });
      // Captura con el CSS real, para revisar a ojo.
      await page.screenshot({ path: `capturas/${nombre}-${ancho}.png`, fullPage: true, scale: 'css' });
      info.attachments.push({ name: 'captura', path: `capturas/${nombre}-${ancho}.png`, contentType: 'image/png' });
      await sinRedDeSeguridad(page);
      await esperarSinDesborde(page);
    });

    test('tampoco con textos largos y sin espacios', async ({ page }) => {
      await page.goto(ruta, { waitUntil: 'networkidle' });
      await sinRedDeSeguridad(page);
      await page.evaluate(
        ([largo, sinEspacios]) => {
          const poner = (selector: string, texto: string) =>
            document.querySelectorAll(selector).forEach((el) => (el.textContent = texto));
          // Tarjetas (home y anteriores)
          poner('[data-evento] h3', `${largo} ${sinEspacios}`);
          poner('[data-evento] dd', sinEspacios);
          poner('[data-evento] a > div:first-of-type > span', sinEspacios);
          // Página del evento
          poner('[data-pagina-evento] h1', `${largo} ${sinEspacios}`);
          poner('main article dd', sinEspacios);
          poner('#programa ~ ol h3, #programa ~ ol p', sinEspacios);
          // Mail de Sumate y del pie
          poner('a[href^="mailto:"] > span', `${sinEspacios}@gmail.com`);
          // Botones de WhatsApp de Sumate
          poner('a[href^="https://wa.me/"] > span', `Escribile a ${sinEspacios}`);
          poner('footer a[href^="mailto:"]', `${sinEspacios}@gmail.com`);
        },
        [LARGO, SIN_ESPACIOS],
      );
      await esperarSinDesborde(page);
    });
  });
}

/**
 * Sumate: un botón por contacto de WhatsApp (D-27), en orden al azar. Los mismos 3 contactos que
 * scripts/build-e2e.mjs, en el orden del dashboard.
 */
const CONTACTOS_E2E = [
  { nombre: 'Pedro', numero: '5492954588587' },
  { nombre: 'Lucas', numero: '5493515551111' },
  { nombre: 'María Florencia de los Ángeles', numero: '5493515552222' },
];

/** Números de los botones de WhatsApp de Sumate, en el orden en que están en la página. */
async function numerosEnPantalla(page: Page) {
  return page
    .locator('#contacto [data-contactos] > li a[href^="https://wa.me/"]')
    .evaluateAll((links) => links.map((a) => new URL((a as HTMLAnchorElement).href).pathname.slice(1)));
}

test.describe('Sumate: botones de WhatsApp', () => {
  test('están los 3 contactos, con su nombre y el mensaje, y no se pasan del ancho', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const ancho = page.viewportSize()!.width;
    for (const { nombre, numero } of CONTACTOS_E2E) {
      const boton = page.getByRole('link', { name: `Escribile a ${nombre} por WhatsApp (abre en otra pestaña)` });
      await boton.scrollIntoViewIfNeeded();
      await expect(boton).toBeVisible();
      expect(await boton.getAttribute('href')).toMatch(new RegExp(`^https://wa\\.me/${numero}\\?text=.+`));
      const caja = (await boton.boundingBox())!;
      expect(caja.x + caja.width, nombre).toBeLessThanOrEqual(ancho);
    }
    // El orden es al azar: se comparan como conjunto.
    expect((await numerosEnPantalla(page)).sort()).toEqual(CONTACTOS_E2E.map((c) => c.numero).sort());
    await sinRedDeSeguridad(page);
    await esperarSinDesborde(page);
  });

  test('el orden se mezcla en el navegador; Instagram y mail quedan después', async ({ page }) => {
    // Con este azar fijo, mezclar() deja [b, c, a] (ver src/lib/mezclar.test.ts).
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const [a, b, c] = CONTACTOS_E2E.map((x) => x.numero);
    expect(await numerosEnPantalla(page)).toEqual([b, c, a]);
    const tipos = await page
      .locator('#contacto [data-contactos] > li')
      .evaluateAll((items) => items.map((li) => ((li as HTMLElement).dataset.whatsapp === undefined ? 'otro' : 'whatsapp')));
    expect(tipos.slice(0, 3)).toEqual(['whatsapp', 'whatsapp', 'whatsapp']);
    expect(tipos.slice(3).every((t) => t === 'otro')).toBe(true);
    await sinRedDeSeguridad(page);
    await esperarSinDesborde(page);
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('quedan los 3 en el orden del dashboard', async ({ page }) => {
      await page.goto('/');
      expect(await numerosEnPantalla(page)).toEqual(CONTACTOS_E2E.map((c) => c.numero));
    });
  });
});

test('el encabezado sigue fijo arriba al bajar (overflow-x: clip no rompe el sticky)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(page.locator('[data-header]')).toBeInViewport();
  expect(await page.locator('[data-header]').evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
});
