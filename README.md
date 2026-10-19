# Comisión Córdoba · Ateneo CARTEZ

Landing estática hecha con Astro + Tailwind CSS (+ React, para componentes de shadcn/21st.dev).

## Correr en local

Requiere Node 22.12 o superior.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera el sitio estático en dist/
npm run preview   # sirve dist/ para revisarlo
npm run check     # chequeo de tipos
npm test          # tests (Vitest)
npm run test:e2e  # build de prueba en dist-e2e/ + Playwright en Chrome (capturas en capturas/)
npm run snapshot  # actualiza src/data/sitio.json con el contenido de producción (ver abajo)
npm run og        # regenera public/og.png (imagen para compartir el link)
npm run logo      # regenera src/assets/logos/logo-disco.png (logo en disco blanco)
```

Para leer el contenido de Supabase en local, copiar `.env.example` a `.env` y completar la clave pública (anon key) de cartez-dev. Sin `.env`, el build usa el snapshot `src/data/sitio.json` y avisa en la consola.

## De dónde sale el contenido

**Textos, contactos, imágenes del sitio, la mesa (sección Comisión) y los eventos se editan en el dashboard** (secciones Sitio web, Mesa y Eventos), no en este repo. Después de guardar, alguien de la mesa toca **«Publicar cambios»** y Cloudflare vuelve a armar el sitio en unos 3 minutos. Además, el sitio se reconstruye solo todos los días a las 9 (ver `docs/OPERACION.md` del dashboard, sección 10).

Cómo funciona (D-20 y D-23 del dashboard):

- En el **build** (nunca en el navegador del visitante), `src/lib/contenido.ts` llama a la función pública `contenido_landing()` de Supabase con la clave pública. Es lo único que esa clave puede leer de la base.
- Si la lectura falla o tarda más de 10 segundos (`CONTENIDO_TIMEOUT_MS`), el build **no se rompe**: usa el **snapshot** versionado `src/data/sitio.json` y deja en el log `[contenido] ⚠ No se pudo leer Supabase (motivo)`. Si salió bien, deja `[contenido] Supabase OK (prod): …`.
- El snapshot no se actualiza solo. Cuando el log dice `el snapshot versionado difiere`, correr `npm run snapshot` (con el `.env` de **producción**), revisar el diff, `npm test` y commitear. También sirve el artifact `contenido-landing-prod` del workflow diario del dashboard, que tiene el mismo formato.
- Las fotos de la mesa (bucket `galeria`) y los flyers de los eventos (bucket `landing`) vienen de Supabase Storage: se descargan y optimizan en el build (`astro:assets`). El visitante nunca le pide nada a Supabase. Solo se aceptan los dos proyectos y esos dos buckets (`image.remotePatterns` en `astro.config.mjs` y `HOSTS_SUPABASE` en `src/lib/contenido.ts`).
- Cada evento se valida por separado: si uno no cumple el contrato, se descarta con `[contenido] evento descartado: <id> (<motivo>)` en el log y los demás se muestran. Solo si falta la lista de eventos entera se usa el snapshot.
- Si no hay mesa vigente, la sección Comisión y su ítem del menú no se muestran.
- La galería todavía no se muestra (fase 6b del dashboard): `getGaleria()` ya existe, pero ninguna sección la usa.

En `sitio.json`, `configuracion_sitio` es la fila del dashboard. Las imágenes se indican con el nombre de un archivo de `src/assets/fotos/` (ej. `franja-cultivo-girasoles.jpg`) o con una URL `https://` de Supabase. Los medios de contacto son opcionales: si quedan vacíos, su botón no se muestra.

## Eventos

Los eventos se cargan en el dashboard, sección **Eventos** (solo la mesa, D-23 y D-24): nombre, fechas y horario, lugar, marco, tipo, quién organiza y quiénes acompañan, formato, inscripción, costo, descripción corta y larga, programa y flyer. Aparecen en la página los que están marcados **«Mostrar en la página»**, después de tocar **«Publicar cambios»**. Ver `docs/OPERACION.md` del dashboard.

- **Home (sección Eventos):** solo los próximos y en curso, con la tarjeta (descripción corta, fecha y hora, lugar, tipo, quién organiza —«Organiza la Comisión» u «Organiza: <nombre>»— y «La Comisión participa»). La tarjeta lleva a la página del evento.
- **Página del evento:** `src/pages/eventos/[slug].astro` genera `/eventos/<slug>/` para cada evento publicado, también los terminados. Tiene el detalle completo, el programa como agenda, el botón **Compartir** (`src/components/eventos/Compartir.astro`: menú nativo en el celular; WhatsApp y «Copiar link» en la compu) y meta tags Open Graph con imagen de 1200×630 (la foto del tipo recortada, o el flyer entero sobre fondo navy).
- **Eventos anteriores:** `/eventos/anteriores/`, del que terminó más recientemente. Un evento terminado no desaparece: queda con «Finalizado» y sin botón de inscripción.
- La tarjeta usa el flyer y, si no hay, la foto que eligió su tipo en el dashboard (`categoria` en el contrato, `src/lib/fotos.ts`).
- `contenido_landing()` devuelve todos los publicados y no dados de baja; `src/lib/eventos.ts` (`convertirEventos`, `eventosProximos`, `eventosAnteriores`) los convierte al tipo `Evento` y los separa.

Cómo se muestran:

- Se ordenan por fecha de inicio. Formato: `10 mar` (un día), `10–12 mar` (mismo mes), `30 mar – 2 abr` (distinto mes), `30 dic 2026 – 2 ene 2027` (distinto año).
- Un evento de un día lleva la etiqueta **Hoy** ese día. Uno de varios días lleva **En curso** entre el primer y el último día.
- Un evento termina a las **23:00 (hora de Córdoba) del último día**: sale de la home y pasa a «Eventos anteriores».
- El sitio es estático: al cargar, cada página corrige lo que cambió después del último build (la home oculta los terminados; «Eventos anteriores» los muestra; la página del evento marca «Finalizado» y saca la inscripción). Sí hace falta publicar (o esperar la reconstrucción diaria de las 9, hora de Córdoba) para que aparezca un evento nuevo.

## Publicación

El sitio se publica en https://ateneo-cartez-cordoba.pages.dev (`SITIO_PRODUCCION` en `src/lib/entorno.ts`; si cambia el dominio, actualizarlo ahí). `site` de Astro sale de `siteDeRama(CF_PAGES_BRANCH)`: en `main` es producción y en otra rama es su preview (`dev` → https://dev.ateneo-cartez-cordoba.pages.dev), así la URL canónica, Open Graph y «Compartir» de un preview apuntan al mismo preview. Cloudflare Pages construye cada push:

| Rama | Dónde se ve | Lee de | Indexable |
|---|---|---|---|
| `main` | https://ateneo-cartez-cordoba.pages.dev (producción) | cartez-prod | sí |
| `dev` | https://dev.ateneo-cartez-cordoba.pages.dev (preview fijo) | cartez-dev | no (`noindex`) |
| otras | URL de preview de cada deploy | cartez-dev | no (`noindex`) |

- Variables en Cloudflare (Settings → Variables and secrets): `SUPABASE_URL` y `SUPABASE_ANON_KEY`, con valores de cartez-prod en **Production** y de cartez-dev en **Preview**, más `NODE_VERSION=22` en los dos.
- La página sale con `<meta name="robots" content="noindex, nofollow">` salvo que se construya la rama `main` **y** los datos sean de prod (`src/lib/entorno.ts`). Así un preview con datos de prueba nunca se indexa.
- Deploy Hooks: `publicar-prod` (rama `main`) y `publicar-dev` (rama `dev`). Sus URLs son secretas: solo están en los secrets de Supabase (`DEPLOY_HOOK_URL` de la Edge Function `publicar-landing`) y de GitHub (`CLOUDFLARE_DEPLOY_HOOK_PROD`).

La imagen que aparece al compartir el link es `public/og.png` (1200×630, menos de 300 KB para que WhatsApp muestre la vista previa). Se genera con `npm run og` (`scripts/generar-og.mjs`): la foto del hero de escritorio con velo navy, el logo en disco y el nombre en Fraunces y dorado. El texto se convierte en trazos a partir de las fuentes de @fontsource, así que sale igual en cualquier máquina. Si cambia el logo o la foto, volver a correrlo y commitear el PNG.

## Logos

Están en `src/assets/logos/` (no en `public/`) para que Astro los optimice en el build. Están pensados para fondo claro.

- `logo-horizontal.png`: header.
- `logo-redondo.png`: favicon e imagen para compartir.
- `logo-disco.png`: el logo dentro de un disco blanco, para el hero y el footer (fondos oscuros). Se genera desde `logo-redondo-original.jpeg` con `npm run logo`; si cambia el logo, reemplazar ese archivo y volver a correrlo.

## Estilos

Colores, radios y fuentes están definidos como variables en `src/styles/global.css`; los componentes no usan colores fijos.

| Color | Valor | Uso |
|---|---|---|
| Azul marino | `#13216B` | primario, títulos, fondos oscuros (footer: `#0B1440`) |
| Verde | `#1F9A50` | acentos, íconos, bordes, texto grande |
| Verde oscuro | `#177A3F` | texto verde normal y botones con texto blanco |
| Dorado | `#C9A13B` | decorativo, o texto sobre azul marino. **Nunca texto sobre blanco** |
| Negro | `#111111` | texto de cuerpo |

Los mismos valores están en `src/lib/contraste.ts`: `npm test` verifica que coincidan con `global.css` y que todas las combinaciones de texto cumplan WCAG AA. Si se cambia un color, hay que cambiarlo en los dos lugares.

Tipografías: Fraunces (títulos) e Inter (cuerpo), self-hosted con `@fontsource`.

Fotos: ver `CREDITOS.md`.

Los componentes de shadcn/21st.dev se agregan con `npx shadcn@latest add <componente o URL>` y quedan en `src/components/ui/`.
