/**
 * ¿El build es el sitio público de producción? Módulo puro.
 *
 * Solo si Cloudflare está construyendo la rama `main` (CF_PAGES_BRANCH) Y los datos son de
 * cartez-prod. Cualquier otro caso (preview `dev`, otra rama, build local, o un build de main que
 * por error leyó cartez-dev) sale con `noindex`: un preview con datos de prueba nunca se indexa.
 */
export function esProduccion(rama: string | undefined, entornoDatos: 'dev' | 'prod'): boolean {
  return rama === 'main' && entornoDatos === 'prod';
}

/** Sitio de producción: URL canónica y Open Graph de la rama `main`. */
export const SITIO_PRODUCCION = 'https://ateneo-cartez-cordoba.pages.dev';

/**
 * `site` de Astro según la rama que construye Cloudflare (CF_PAGES_BRANCH). `main` (o un build
 * local, sin rama) usa producción. Cualquier otra rama usa su alias de preview
 * (`dev` → https://dev.ateneo-cartez-cordoba.pages.dev), para que el link de «Compartir», la URL
 * canónica y la imagen de Open Graph apunten a ese mismo preview y no a producción.
 * El alias sigue la regla de Cloudflare: minúsculas, lo que no es letra o número pasa a `-`,
 * hasta 28 caracteres.
 */
export function siteDeRama(rama: string | undefined): string {
  if (!rama || rama === 'main') return SITIO_PRODUCCION;
  const alias = rama
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 28)
    .replace(/^-+|-+$/g, '');
  return alias ? SITIO_PRODUCCION.replace('https://', `https://${alias}.`) : SITIO_PRODUCCION;
}
