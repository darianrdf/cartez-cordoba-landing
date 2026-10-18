# Landing Comisión Córdoba · Ateneo CARTEZ

Sitio 100% estático, mobile-first (el tráfico llega desde Instagram en celular). Textos y UI en español rioplatense.

## Stack

- Astro + TypeScript estricto. Un componente `.astro` por sección en `src/components/sections/`, montados en `src/pages/index.astro`.
- Tailwind CSS v4 (vía `@tailwindcss/vite`).
- React solo como islands, para componentes de 21st.dev / shadcn/ui. Van en `src/components/ui/`. Alias `@/` → `src/`, `cn()` en `src/lib/utils.ts`, config en `components.json`. No usar React donde alcanza con Astro.
- Tests con Vitest (`npm test`). Antes de commitear: `npm test`, `npm run check` y `npm run build`.

## Acceso a datos

- Eventos, comisión, galería y contenido del sitio se leen **solo** a través de `src/lib/data.ts` (`getEventos()`, `getComision()`, `getSitio()`, `getGaleria()`, `getSecciones()`, `esSitioPublico()`). Los componentes nunca importan `astro:content`, los JSON de `src/data/` ni `contenido.ts`.
- `data.ts` convierte la fuente a los tipos de dominio de `src/lib/tipos.ts`. Esos tipos no deben depender de la fuente.
- **Sitio y comisión vienen de Supabase, leídos en el build** (D-20 del dashboard): `src/lib/contenido.ts` (puro) llama a `contenido_landing()` con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (variables del build, sin `PUBLIC_`), valida el contrato `version` 1 con zod y, si falla o tarda más de `CONTENIDO_TIMEOUT_MS` (10 s), usa el snapshot `src/data/sitio.json` con un `console.warn('[contenido] ⚠ …')`. El build nunca se rompe por la red. `data.ts` cachea la promesa: una sola lectura por build. **Nunca** leer Supabase desde el navegador.
- El snapshot `src/data/sitio.json` es la salida de la función más `origen`, siempre de **producción** (lo verifica `sitio.test.ts`). Se actualiza a mano con `npm run snapshot` y commit; nunca con commits automáticos.
- La función devuelve rutas de Storage (`foto_path`, `path`, `flyer_path`), no URLs: `urlStorage(origen, bucket, ruta)` las arma. Las imágenes remotas solo pueden ser de cartez-prod o cartez-dev y de los buckets `galeria` y `landing`: `HOSTS_SUPABASE` y `BucketPublico` en `contenido.ts` e `image.remotePatterns` en `astro.config.mjs` (mantener todo igual). Se optimizan en el build con `astro:assets`.
- Un campo nuevo del dashboard se agrega a propósito en los dos repos: `contenido_landing()`, `tests/fixtures/contrato-landing.json` del dashboard y `contenidoSchema` de acá. Las claves desconocidas se descartan.
- Eventos: vienen del dashboard (D-23) en `contenido.eventos`. Cada evento se valida por separado (`eventosValidos`): uno inválido se descarta con `console.warn('[contenido] evento descartado: <id> (<motivo>)')` y el resto sigue; solo si falta la lista o no es un array se usa el snapshot. `eventosDeContenido()` (`src/lib/eventos.ts`, puro) los convierte al tipo `Evento`. Galería: `getGaleria()` existe, pero ninguna sección la muestra todavía (fase 6b).
- Textos y contactos: `getSitio()`, sobre `configuracion_sitio` (una sola fila, snake_case). `src/lib/sitio.ts` es puro: valida la fila y la convierte al tipo `Sitio` (`parsearSitio`), y arma las URLs de contacto.
- `noindex` fuera de producción: `esSitioPublico()` (`src/lib/entorno.ts`) exige `CF_PAGES_BRANCH === 'main'` **y** datos de prod.
- Los medios de contacto son opcionales. Un componente nunca debe asumir que existen: si falta el dato, no se renderiza el botón o link.
- Todo contenido editable (textos, contactos, eventos, comisión) pasa por `data.ts`. Nada de texto editable hardcodeado en componentes: en el futuro se edita desde un dashboard.

## Fechas

- Zona horaria **America/Argentina/Cordoba** para toda lógica de fechas. Nunca comparar en UTC ni con la hora del servidor o del navegador.
- Toda la lógica vive en `src/lib/fechas.ts`, un módulo puro sin dependencias de Astro (se usa en el build y en el navegador). Cualquier cambio va con test en `src/lib/fechas.test.ts`.
- Las fechas de eventos son fechas civiles `YYYY-MM-DD` (columnas `date` de Postgres). Si alguna vez llegan como `Date` (p. ej. YAML, que parsea `2026-10-23` como medianoche UTC), se pasan por `normalizarFecha()`.
- Un evento vence a las `HORA_VENCIMIENTO` (23:00) del día `fechaFin` en Córdoba. Es una constante única en el código de la landing; la base la repite en `privado.vencimiento_evento()` (dashboard, D-23): si cambia, cambian las dos (y la copia de `fechas.ts` del dashboard).
- Doble filtro: el build no renderiza los vencidos y un script del navegador oculta los que vencieron después del build (`data-vence` en ISO 8601 con offset).

## Estilos

- Colores, radios y fuentes **solo vía tokens** definidos en `src/styles/global.css` (`bg-background`, `text-muted-foreground`, `rounded-lg`…). Nada de colores literales de Tailwind (`gray-500`, `#hex`) en componentes.
- Paleta de la marca: navy `#13216B` (footer `navy-deep`), verde `#1F9A50` (acentos, íconos, texto grande), `green-strong` `#177A3F` (texto normal y botones con texto blanco), dorado `#C9A13B` (decorativo o sobre navy, **nunca texto sobre blanco**), ink `#111111` (cuerpo). Derivados: `tint-green`, `tint-gold` (fondos), `navy-muted` / `on-dark-muted` (texto atenuado).
- Los colores se repiten en `src/lib/contraste.ts`; `contraste.test.ts` verifica que coincidan con `global.css` y que cada combinación de texto cumpla WCAG AA. Toda combinación nueva de texto/fondo se agrega a ese test.
- Tipografías: Fraunces (títulos, `font-display`) e Inter (cuerpo), self-hosted con @fontsource, solo subset latin y pesos usados.
- Animaciones sutiles y en CSS (scroll-driven `.aparecer`, transiciones de hover). Siempre respetar `prefers-reduced-motion`.
- Los logos (`src/assets/logos/`) son PNG transparentes **pensados para fondo claro**. Sobre fotos o fondos oscuros (hero, footer) se usa `logo-disco.png` (logo en disco blanco, `npm run logo`).
- Imágenes siempre con `astro:assets` (`<Image>`, `getImage()`), lazy salvo el hero. Las imágenes editables (hero, franja, eventos) aceptan archivo local o URL https (`Imagen` en `tipos.ts`, helpers en `src/lib/imagenes.ts`); las remotas deben estar en `image.remotePatterns`.

## Accesibilidad

HTML semántico, `alt` en imágenes, foco visible, menú con `aria-expanded`/`aria-controls`, sin JS innecesario.
