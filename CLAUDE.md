# Landing Comisión Córdoba · Ateneo CARTEZ

Sitio 100% estático, mobile-first (el tráfico llega desde Instagram en celular). Textos y UI en español rioplatense.

## Stack

- Astro + TypeScript estricto. Un componente `.astro` por sección en `src/components/sections/`, montados en `src/pages/index.astro`.
- Tailwind CSS v4 (vía `@tailwindcss/vite`).
- React solo como islands, para componentes de 21st.dev / shadcn/ui. Van en `src/components/ui/`. Alias `@/` → `src/`, `cn()` en `src/lib/utils.ts`, config en `components.json`. No usar React donde alcanza con Astro.
- Tests con Vitest (`npm test`). Antes de commitear: `npm test`, `npm run check`, `npm run build` y `npm run test:e2e`.
- E2E con Playwright (`e2e/*.e2e.ts`, en el Google Chrome instalado, `channel: 'chrome'`). `npm run test:e2e` arma un build aparte en `dist-e2e/` con contenido fijo (`scripts/build-e2e.mjs`: el snapshot + eventos de prueba con fechas relativas a hoy, vía `CONTENIDO_E2E`) y lo sirve con `astro preview`. Astro permite un solo preview por proyecto: si hay otro abierto, `npx astro preview stop`. Las capturas quedan en `capturas/` (ignorado).
- `site` sale de `siteDeRama(CF_PAGES_BRANCH)` (`src/lib/entorno.ts`): producción en `main`, el preview de la rama en las demás. La URL canónica, Open Graph y «Compartir» la usan.

## Acceso a datos

- Eventos, comisión, galería y contenido del sitio se leen **solo** a través de `src/lib/data.ts` (`getEventos()`, `getComision()`, `getSitio()`, `getGaleria()`, `getSecciones()`, `esSitioPublico()`). Los componentes nunca importan `astro:content`, los JSON de `src/data/` ni `contenido.ts`.
- `data.ts` convierte la fuente a los tipos de dominio de `src/lib/tipos.ts`. Esos tipos no deben depender de la fuente.
- **Sitio y comisión vienen de Supabase, leídos en el build** (D-20 del dashboard): `src/lib/contenido.ts` (puro) llama a `contenido_landing()` con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (variables del build, sin `PUBLIC_`), valida el contrato `version` 1 con zod y, si falla o tarda más de `CONTENIDO_TIMEOUT_MS` (10 s), usa el snapshot `src/data/sitio.json` con un `console.warn('[contenido] ⚠ …')`. El build nunca se rompe por la red. `data.ts` cachea la promesa: una sola lectura por build. **Nunca** leer Supabase desde el navegador.
- El snapshot `src/data/sitio.json` es la salida de la función más `origen`, siempre de **producción** (lo verifica `sitio.test.ts`). Se actualiza a mano con `npm run snapshot` y commit; nunca con commits automáticos.
- La función devuelve rutas de Storage (`foto_path`, `path`, `flyer_path`), no URLs: `urlStorage(origen, bucket, ruta)` las arma. Las imágenes remotas solo pueden ser de cartez-prod o cartez-dev y de los buckets `galeria` y `landing`: `HOSTS_SUPABASE` y `BucketPublico` en `contenido.ts` e `image.remotePatterns` en `astro.config.mjs` (mantener todo igual). Se optimizan en el build con `astro:assets`.
- Un campo nuevo del dashboard se agrega a propósito en los dos repos: `contenido_landing()`, `tests/fixtures/contrato-landing.json` del dashboard y `contenidoSchema` de acá. Las claves desconocidas se descartan.
- Eventos: vienen del dashboard (D-23, D-24) en `contenido.eventos`, **también los terminados**. Cada evento se valida por separado (`eventosValidos`): uno inválido se descarta con `console.warn('[contenido] evento descartado: <id> (<motivo>)')` y el resto sigue; solo si falta la lista o no es un array se usa el snapshot. `convertirEventos()` (`src/lib/eventos.ts`, puro) los convierte al tipo `Evento`; `getEventos()` da los próximos (home), `getEventosAnteriores()` los terminados y `getTodosLosEventos()` uno por página `/eventos/<slug>/`. La tarjeta es `src/components/eventos/TarjetaEvento.astro` (badge de quién organiza: `etiquetaOrganizador()`); la página del evento tiene `Compartir.astro` (textos en `src/lib/compartir.ts`, puro). La tarjeta entera es un `<a>`: no meter botones adentro. Los flyers se verifican una vez por build (`conFlyersDisponibles`, `src/lib/flyers.ts`, desde `getTodosLosEventos()`): si uno no baja (red o 5xx: un reintento a los ~2 s; 4xx: sin reintento) o no es una imagen, ese evento sigue sin flyer (foto del tipo en tarjeta, detalle y og) con `console.warn('[contenido] flyer no disponible: <slug> (<motivo>)')`, y el build no se rompe. og:image siempre 1200×630: la foto del tipo con `getImage` (`fit: cover`) y el flyer con el endpoint `src/pages/eventos/[slug]/og.jpg.ts` (`ogSinRecortar`, `src/lib/og.ts`), porque el `fit: contain` de Astro no agrega fondo (es `inside` de sharp). En el contrato, `categoria` es la foto por defecto del tipo y `descripcion` es la descripción corta (compatibles con D-23). Galería: `getGaleria()` existe, pero ninguna sección la muestra todavía (fase 6b).
- Textos y contactos: `getSitio()`, sobre `configuracion_sitio` (una sola fila, snake_case). `src/lib/sitio.ts` es puro: valida la fila y la convierte al tipo `Sitio` (`parsearSitio`), y arma las URLs de contacto.
- `noindex` fuera de producción: `esSitioPublico()` (`src/lib/entorno.ts`) exige `CF_PAGES_BRANCH === 'main'` **y** datos de prod.
- Los medios de contacto son opcionales. Un componente nunca debe asumir que existen: si falta el dato, no se renderiza el botón o link.
- Todo contenido editable (textos, contactos, eventos, comisión) pasa por `data.ts`. Nada de texto editable hardcodeado en componentes: en el futuro se edita desde un dashboard.

## Fechas

- Zona horaria **America/Argentina/Cordoba** para toda lógica de fechas. Nunca comparar en UTC ni con la hora del servidor o del navegador.
- Toda la lógica vive en `src/lib/fechas.ts`, un módulo puro sin dependencias de Astro (se usa en el build y en el navegador). Cualquier cambio va con test en `src/lib/fechas.test.ts`.
- Las fechas de eventos son fechas civiles `YYYY-MM-DD` (columnas `date` de Postgres). Si alguna vez llegan como `Date` (p. ej. YAML, que parsea `2026-10-23` como medianoche UTC), se pasan por `normalizarFecha()`.
- Un evento vence a las `HORA_VENCIMIENTO` (23:00) del día `fechaFin` en Córdoba. Es una constante única en el código de la landing; la base la repite en `privado.vencimiento_evento()` (dashboard, D-23): si cambia, cambian las dos (y la copia de `fechas.ts` del dashboard).
- Doble filtro: el build decide qué está terminado y un script del navegador corrige lo que terminó después del build (`data-vence` en ISO 8601 con offset): la home lo oculta, «Eventos anteriores» lo muestra y la página del evento marca «Finalizado» y saca la inscripción.
- Las páginas que no son la home (`/eventos/…`) usan las anclas del encabezado y el pie como `/#seccion`.

## Estilos

- Colores, radios y fuentes **solo vía tokens** definidos en `src/styles/global.css` (`bg-background`, `text-muted-foreground`, `rounded-lg`…). Nada de colores literales de Tailwind (`gray-500`, `#hex`) en componentes.
- Paleta de la marca: navy `#13216B` (footer `navy-deep`), verde `#1F9A50` (acentos, íconos, texto grande), `green-strong` `#177A3F` (texto normal y botones con texto blanco), dorado `#C9A13B` (decorativo o sobre navy, **nunca texto sobre blanco**), ink `#111111` (cuerpo). Derivados: `tint-green`, `tint-gold` (fondos), `navy-muted` / `on-dark-muted` (texto atenuado).
- Los colores se repiten en `src/lib/contraste.ts`; `contraste.test.ts` verifica que coincidan con `global.css` y que cada combinación de texto cumpla WCAG AA. Toda combinación nueva de texto/fondo se agrega a ese test.
- Tipografías: Fraunces (títulos, `font-display`) e Inter (cuerpo), self-hosted con @fontsource, solo subset latin y pesos usados.
- **Nada más ancho que la pantalla del celular** (achica toda la página). Una grilla que se abre en `sm:`/`md:` lleva `grid-cols-1` de base (la columna implícita se estira con el contenido) y `minmax(0,1fr)` en vez de `1fr`; hijos de flex/grid con texto variable, `min-w-0`; textos largos que vienen del dashboard (títulos, lugares, mails), `wrap-anywhere`. `overflow-x: clip` en html/body es solo red de seguridad (no `hidden`: rompe el header sticky). Lo vigila `e2e/desborde.e2e.ts` en 360, 390 y 414 px.
- Texto sobre fotos: fondo sólido (pastilla) o un velo cuyo peor caso (foto blanca) esté en `contraste.test.ts` (`superponer()`).
- Animaciones sutiles y en CSS (scroll-driven `.aparecer`, transiciones de hover). Siempre respetar `prefers-reduced-motion`.
- Los logos (`src/assets/logos/`) son PNG transparentes **pensados para fondo claro**. Sobre fotos o fondos oscuros (hero, footer) se usa `logo-disco.png` (logo en disco blanco, `npm run logo`).
- Imágenes siempre con `astro:assets` (`<Image>`, `getImage()`), lazy salvo el hero. Las imágenes editables (hero, franja, eventos) aceptan archivo local o URL https (`Imagen` en `tipos.ts`, helpers en `src/lib/imagenes.ts`); las remotas deben estar en `image.remotePatterns`.

## Accesibilidad

HTML semántico, `alt` en imágenes, foco visible, menú con `aria-expanded`/`aria-controls`, sin JS innecesario.
