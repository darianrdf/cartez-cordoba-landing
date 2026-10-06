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
```

## Agregar un evento

Crear un `.md` en `src/content/eventos/` (por ejemplo `2027-03-expo.md`):

```md
---
titulo: Expo Agro
fecha: 2027-03-10
lugar: Predio ferial, Córdoba
categoria: rural        # rural | congreso | charla | visita | peña | actividad
organizador: propio     # propio | externo
link: https://...       # opcional
flyer: ./expo.jpg       # opcional, imagen guardada al lado del .md
---

Descripción corta (opcional).
```

Solo se muestran los eventos de hoy en adelante, ordenados por fecha. **El filtro se aplica al hacer el build**, así que hay que volver a compilar y publicar el sitio para que los eventos pasados desaparezcan.

## Editar la comisión

`src/data/comision.json`:

- `etapa`: texto que aparece bajo el título.
- `miembros[]`: `cargo`, `nombre`, `foto` (ruta dentro de `public/`, ej. `/img/comision/juan.jpg`), `orden`, `destacado`.
- `orden` define las filas: los miembros con el mismo número comparten fila, de menor a mayor.
- Solo se muestran los que tienen `destacado: true`.

Los cargos son texto libre: se pueden cambiar sin tocar código.

## Editar textos y contacto

`src/data/sitio.json`: nombre, descripción para buscadores y redes, frase del hero, textos de Conocenos, objetivos, mail, usuario de Instagram (sin @), WhatsApp (número internacional sin `+`, ej. `5493511234567`) y el mensaje precargado.

Antes de publicar, cambiar `site` en `astro.config.mjs` por el dominio real y reemplazar `public/og.png` (1200×630) por la imagen para compartir.

## Estilos

Colores, radios y fuentes están definidos como variables en `src/styles/global.css`. Para cambiar la paleta se editan solo esas variables.

Los componentes de shadcn/21st.dev se agregan con `npx shadcn@latest add <componente o URL>` y quedan en `src/components/ui/`.
