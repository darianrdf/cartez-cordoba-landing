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
npm run og        # regenera public/og.png (imagen para compartir el link)
```

> **Temporal:** hoy los eventos, la comisión y los textos y contactos se cargan desde archivos del repositorio. Cuando se integre Supabase, todo este contenido se va a editar desde el dashboard, sin tocar código, y esta forma de editarlos deja de aplicar.

## Agregar un evento

Crear un `.md` en `src/content/eventos/` (por ejemplo `2027-03-expo.md`).

**De un día:**

```md
---
titulo: Charla de mercados
fecha: 2027-03-10
lugar: Sede de la Comisión, Córdoba
categoria: charla       # rural | congreso | charla | visita | peña | actividad
organizador: propio     # propio | externo
link: https://...       # opcional
flyer: ./charla.jpg     # opcional, imagen guardada al lado del .md
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

## Editar la comisión

`src/data/comision.json`:

- `etapa`: texto que aparece bajo el título.
- `miembros[]`:
  - `cargo` y `nombre`: texto libre. Los cargos se pueden cambiar sin tocar código.
  - `foto`: ruta dentro de `public/` (ej. `/img/comision/juan.jpg`) o URL externa. Con `null` se muestran las iniciales.
  - `orden`: define las filas. Los miembros con el mismo número comparten fila, de menor a mayor.
  - `destacado`: solo se muestran los que tienen `true`.

Para agregar un miembro, copiar una línea, cambiar los datos y respetar las comas entre elementos.

## Editar textos y contacto

`src/data/sitio.json` tiene una estructura plana: cada campo será una columna de la tabla `configuracion_sitio` en Supabase.

| Campo | Qué es |
|---|---|
| `nombre`, `organizacion` | Nombre que aparece en el hero, el footer y el título de la página |
| `descripcion_meta` | Descripción para buscadores y para la vista previa al compartir el link |
| `hero_frase` | Frase de una línea debajo del nombre |
| `conocenos_ateneo_titulo` / `_texto` | Bloque "¿Qué es el Ateneo CARTEZ?" |
| `conocenos_comision_titulo` / `_texto` | Bloque "¿Qué es la Comisión Córdoba?" |
| `objetivos` | Lista de objetivos (uno por línea) |
| `instagram` | Usuario, sin @ (ej. `cba.ateneocartez`) |
| `mail` | Mail de contacto |
| `whatsapp` | Número internacional, solo dígitos (ej. `5492954588587`) |
| `whatsapp_mensaje` | Mensaje precargado al abrir el chat |

Los medios de contacto son opcionales: si `instagram`, `mail` o `whatsapp` quedan vacíos (`""`), su botón no se muestra.

**WhatsApp:** es el número del coordinador actual. Hay que actualizarlo cada vez que cambia el mandato. En la página no aparece el número, solo el botón "Escribinos por WhatsApp".

## Publicación

El sitio se publica en https://ateneo-cartez-cordoba.pages.dev (configurado como `site` en `astro.config.mjs`; si cambia el dominio, actualizarlo ahí).

La imagen que aparece al compartir el link es `public/og.png` (1200×630). Se genera con `npm run og` a partir del logo redondo, con el script `scripts/generar-og.mjs`. Si cambia el logo, volver a correrlo y commitear el PNG.

## Logos

Están en `src/assets/logos/` (no en `public/`) para que Astro los optimice en el build. Para cambiarlos, reemplazar `logo-horizontal.png` (header) y `logo-redondo.png` (hero y favicon) manteniendo el nombre. Están pensados para fondo claro.

## Estilos

Colores, radios y fuentes están definidos como variables en `src/styles/global.css`. Para cambiar la paleta se editan solo esas variables.

Los componentes de shadcn/21st.dev se agregan con `npx shadcn@latest add <componente o URL>` y quedan en `src/components/ui/`.
