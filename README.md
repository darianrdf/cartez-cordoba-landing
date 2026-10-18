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
npm run snapshot  # actualiza src/data/sitio.json con el contenido de producción (ver abajo)
npm run og        # regenera public/og.png (imagen para compartir el link)
npm run logo      # regenera src/assets/logos/logo-disco.png (logo en disco blanco)
```

Para leer el contenido de Supabase en local, copiar `.env.example` a `.env` y completar la clave pública (anon key) de cartez-dev. Sin `.env`, el build usa el snapshot `src/data/sitio.json` y avisa en la consola.

## De dónde sale el contenido

**Textos, contactos, imágenes del sitio y la mesa (sección Comisión) se editan en el dashboard** (secciones Sitio web y Mesa), no en este repo. Después de guardar, alguien de la mesa toca **«Publicar cambios»** y Cloudflare vuelve a armar el sitio en unos 3 minutos. Además, el sitio se reconstruye solo todos los días a las 9 (ver `docs/OPERACION.md` del dashboard, sección 10).

Cómo funciona (D-20 del dashboard):

- En el **build** (nunca en el navegador del visitante), `src/lib/contenido.ts` llama a la función pública `contenido_landing()` de Supabase con la clave pública. Es lo único que esa clave puede leer de la base.
- Si la lectura falla o tarda más de 10 segundos (`CONTENIDO_TIMEOUT_MS`), el build **no se rompe**: usa el **snapshot** versionado `src/data/sitio.json` y deja en el log `[contenido] ⚠ No se pudo leer Supabase (motivo)`. Si salió bien, deja `[contenido] Supabase OK (prod): …`.
- El snapshot no se actualiza solo. Cuando el log dice `el snapshot versionado difiere`, correr `npm run snapshot` (con el `.env` de **producción**), revisar el diff, `npm test` y commitear. También sirve el artifact `contenido-landing-prod` del workflow diario del dashboard, que tiene el mismo formato.
- Las fotos de la mesa vienen de Supabase Storage: se descargan y optimizan en el build (`astro:assets`). El visitante nunca le pide nada a Supabase. Solo se aceptan los dos proyectos (`image.remotePatterns` en `astro.config.mjs` y `HOSTS_SUPABASE` en `src/lib/contenido.ts`).
- Si no hay mesa vigente, la sección Comisión y su ítem del menú no se muestran.
- La galería todavía no se muestra (fase 6b del dashboard): `getGaleria()` ya existe, pero ninguna sección la usa.

En `sitio.json`, `configuracion_sitio` es la fila del dashboard. Las imágenes se indican con el nombre de un archivo de `src/assets/fotos/` (ej. `franja-cultivo-girasoles.jpg`) o con una URL `https://` de Supabase. Los medios de contacto son opcionales: si quedan vacíos, su botón no se muestra.

## Agregar un evento

Los eventos todavía se cargan acá, hasta que exista el módulo de eventos del dashboard. Crear un `.md` en `src/content/eventos/` (por ejemplo `2027-03-expo.md`).

**De un día:**

```md
---
titulo: Charla de mercados
fecha: 2027-03-10
lugar: Sede de la Comisión, Córdoba
categoria: charla       # rural | congreso | charla | visita | peña | actividad
organizador: propio     # propio | externo
link: https://...       # opcional
imagen: ./charla.jpg    # opcional: foto de la tarjeta (al lado del .md, o URL https)
flyer: ./flyer.jpg      # opcional
---

Descripción corta (opcional).
```

**De varios días:** agregar `fechaFin` con el último día.

```md
---
titulo: Expo Agro
fecha: 2027-03-10
fechaFin: 2027-03-12
lugar: Predio ferial, Córdoba
categoria: rural
organizador: externo
---
```

Las fechas van en formato `AAAA-MM-DD`, sin hora. Cómo se muestran:

- Se ordenan por fecha de inicio. Formato: `10 mar` (un día), `10–12 mar` (mismo mes), `30 mar – 2 abr` (distinto mes), `30 dic 2026 – 2 ene 2027` (distinto año).
- Un evento de un día lleva la etiqueta **Hoy** ese día. Uno de varios días lleva **En curso** entre el primer y el último día.
- Un evento deja de mostrarse a las **23:00 (hora de Córdoba) del último día**.
- Los eventos vencidos no se incluyen al compilar. Además, la página oculta al cargar los que vencieron después del último build, así que no hace falta recompilar para sacarlos. Sí hace falta compilar y publicar para que aparezca un evento nuevo.

## Publicación

El sitio se publica en https://ateneo-cartez-cordoba.pages.dev (configurado como `site` en `astro.config.mjs`; si cambia el dominio, actualizarlo ahí). Cloudflare Pages construye cada push:

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
