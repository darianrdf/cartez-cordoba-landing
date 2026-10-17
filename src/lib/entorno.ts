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
