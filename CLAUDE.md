# Landing Comisión Córdoba · Ateneo CARTEZ

Sitio 100% estático, mobile-first (el tráfico llega desde Instagram en celular). Textos y UI en español rioplatense.

## Stack

- Astro + TypeScript estricto. Un componente `.astro` por sección en `src/components/sections/`, montados en `src/pages/index.astro`.
- Tailwind CSS v4 (vía `@tailwindcss/vite`).
- React solo como islands, para componentes de 21st.dev / shadcn/ui. Van en `src/components/ui/`. Alias `@/` → `src/`, `cn()` en `src/lib/utils.ts`, config en `components.json`. No usar React donde alcanza con Astro.
- Tests con Vitest (`npm test`). Antes de commitear: `npm test`, `npm run check` y `npm run build`.

## Acceso a datos

- Eventos, comisión y contenido del sitio se leen **solo** a través de `src/lib/data.ts` (`getEventos()`, `getComision()`, `getSitio()`). Los componentes nunca importan `astro:content` ni los JSON de `src/data/`.
- `data.ts` convierte la fuente a los tipos de dominio de `src/lib/tipos.ts`. Esos tipos no deben depender de la fuente.
- Fuente actual: Content Collection (`src/content/eventos/*.md`, schema en `src/content.config.ts`) y `src/data/comision.json`. **Fuente futura: Supabase.** La migración debe tocar solo `data.ts`. Las fotos y flyers vendrán como URL de Supabase Storage, por eso `foto` y `flyer` aceptan URL externa.
- Textos y contactos: `getSitio()`. Fuente actual `src/data/sitio.json`, plano y en snake_case, que mapea 1:1 a la futura tabla `configuracion_sitio` (una sola fila). `src/lib/sitio.ts` es puro: valida la fila y la convierte al tipo `Sitio` (`parsearSitio`), y arma las URLs de contacto.
- Los medios de contacto son opcionales. Un componente nunca debe asumir que existen: si falta el dato, no se renderiza el botón o link.
- Todo contenido editable (textos, contactos, eventos, comisión) pasa por `data.ts`. Nada de texto editable hardcodeado en componentes: en el futuro se edita desde un dashboard.

## Fechas

- Zona horaria **America/Argentina/Cordoba** para toda lógica de fechas. Nunca comparar en UTC ni con la hora del servidor o del navegador.
- Toda la lógica vive en `src/lib/fechas.ts`, un módulo puro sin dependencias de Astro (se usa en el build y en el navegador). Cualquier cambio va con test en `src/lib/fechas.test.ts`.
- Las fechas de eventos son fechas civiles `YYYY-MM-DD`. YAML parsea `2026-10-23` como medianoche UTC, así que siempre se pasa por `normalizarFecha()`.
- Un evento vence a las `HORA_VENCIMIENTO` (23:00) del día `fechaFin` en Córdoba. Es una constante única: no repetirla en otro lado.
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
