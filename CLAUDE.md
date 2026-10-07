# Landing Comisión Córdoba · Ateneo CARTEZ

Sitio 100% estático, mobile-first (el tráfico llega desde Instagram en celular). Textos y UI en español rioplatense.

## Stack

- Astro + TypeScript estricto. Un componente `.astro` por sección en `src/components/sections/`, montados en `src/pages/index.astro`.
- Tailwind CSS v4 (vía `@tailwindcss/vite`).
- React solo como islands, para componentes de 21st.dev / shadcn/ui. Van en `src/components/ui/`. Alias `@/` → `src/`, `cn()` en `src/lib/utils.ts`, config en `components.json`. No usar React donde alcanza con Astro.
- Tests con Vitest (`npm test`). Antes de commitear: `npm test`, `npm run check` y `npm run build`.

## Acceso a datos

- Eventos y comisión se leen **solo** a través de `src/lib/data.ts` (`getEventos()`, `getComision()`). Los componentes nunca importan `astro:content` ni `src/data/comision.json`.
- `data.ts` convierte la fuente a los tipos de dominio de `src/lib/tipos.ts`. Esos tipos no deben depender de la fuente.
- Fuente actual: Content Collection (`src/content/eventos/*.md`, schema en `src/content.config.ts`) y `src/data/comision.json`. **Fuente futura: Supabase.** La migración debe tocar solo `data.ts`. Las fotos y flyers vendrán como URL de Supabase Storage, por eso `foto` y `flyer` aceptan URL externa.
- Textos fijos y contacto: `src/data/sitio.json` vía `src/lib/sitio.ts`.

## Fechas

- Zona horaria **America/Argentina/Cordoba** para toda lógica de fechas. Nunca comparar en UTC ni con la hora del servidor o del navegador.
- Toda la lógica vive en `src/lib/fechas.ts`, un módulo puro sin dependencias de Astro (se usa en el build y en el navegador). Cualquier cambio va con test en `src/lib/fechas.test.ts`.
- Las fechas de eventos son fechas civiles `YYYY-MM-DD`. YAML parsea `2026-10-23` como medianoche UTC, así que siempre se pasa por `normalizarFecha()`.
- Un evento vence a las `HORA_VENCIMIENTO` (23:00) del día `fechaFin` en Córdoba. Es una constante única: no repetirla en otro lado.
- Doble filtro: el build no renderiza los vencidos y un script del navegador oculta los que vencieron después del build (`data-vence` en ISO 8601 con offset).

## Estilos

- Colores, radios y fuentes **solo vía tokens** definidos en `src/styles/global.css` (`bg-background`, `text-muted-foreground`, `rounded-lg`…). Nada de colores literales de Tailwind (`gray-500`, `#hex`) en componentes.
- La paleta actual es provisoria (grises). Para cambiarla se editan solo las variables de `global.css`.
- Los logos (`src/assets/logos/`) son PNG transparentes **pensados para fondo claro**: el header y el hero deben tener fondo claro. Se renderizan con `<Image>` de `astro:assets`.

## Accesibilidad

HTML semántico, `alt` en imágenes, foco visible, menú con `aria-expanded`/`aria-controls`, sin JS innecesario.
