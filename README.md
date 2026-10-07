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
```

> **Temporal:** hoy los eventos y la comisión se cargan desde archivos del repositorio. Cuando se integre Supabase se van a administrar desde ahí y esta forma de editarlos deja de aplicar.

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

- Se ordenan por fecha de inicio. Formato: `10 mar` (un día), `10–12 mar` (mismo mes), `30 mar – 2 abr` (distinto mes).
- Entre el primer y el último día llevan la etiqueta **En curso**.
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

`src/data/sitio.json`: nombre, descripción para buscadores y redes, frase del hero, textos de Conocenos, objetivos, mail, usuario de Instagram (sin @), WhatsApp (número internacional sin `+`, ej. `5493511234567`) y el mensaje precargado.

Antes de publicar, cambiar `site` en `astro.config.mjs` por el dominio real y reemplazar `public/og.png` (1200×630) por la imagen para compartir.

## Logos

Están en `src/assets/logos/` (no en `public/`) para que Astro los optimice en el build. Para cambiarlos, reemplazar `logo-horizontal.png` (header) y `logo-redondo.png` (hero y favicon) manteniendo el nombre. Están pensados para fondo claro.

## Estilos

Colores, radios y fuentes están definidos como variables en `src/styles/global.css`. Para cambiar la paleta se editan solo esas variables.

Los componentes de shadcn/21st.dev se agregan con `npx shadcn@latest add <componente o URL>` y quedan en `src/components/ui/`.
