/**
 * Actualiza el snapshot versionado src/data/sitio.json con lo que devuelve hoy
 * `contenido_landing()` de Supabase. El build lo usa si no puede leer Supabase.
 *
 *   npm run snapshot
 *
 * Lee SUPABASE_URL y SUPABASE_ANON_KEY de .env (o del entorno). El snapshot del repo tiene que ser
 * de PRODUCCIÓN: si la URL es de cartez-dev, el script se niega. No commitea nada: revisá el diff,
 * corré `npm test` (sitio.test.ts valida el snapshot) y commitealo a mano.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ARCHIVO = 'src/data/sitio.json';
const PROD = 'ymxtvtzzkqdngsavuigl.supabase.co';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.SUPABASE_URL?.trim();
const clave = process.env.SUPABASE_ANON_KEY?.trim();
if (!url || !clave) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY (en .env o en el entorno). Ver .env.example.');
  process.exit(1);
}
const origen = new URL(url).origin;
if (new URL(origen).host !== PROD) {
  console.error(`SUPABASE_URL es ${origen}: el snapshot versionado tiene que salir de producción (${PROD}).`);
  process.exit(1);
}

const respuesta = await fetch(`${origen}/rest/v1/rpc/contenido_landing`, {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(20_000),
});
const cuerpo = await respuesta.json().catch(() => null);
if (!respuesta.ok || !cuerpo) {
  console.error(`La API respondió ${respuesta.status}:`, cuerpo);
  process.exit(1);
}
if (cuerpo.version !== 1 || cuerpo.entorno !== 'prod') {
  console.error(`Respuesta inesperada: version ${cuerpo.version}, entorno ${cuerpo.entorno}.`);
  process.exit(1);
}

const anterior = existsSync(ARCHIVO) ? readFileSync(ARCHIVO, 'utf8') : '';
const nuevo = `${JSON.stringify({ origen, ...cuerpo }, null, 2)}\n`;
writeFileSync(ARCHIVO, nuevo);

const sinFecha = (texto) => texto.replace(/"generado_en": "[^"]*"/, '');
console.log(
  sinFecha(anterior) === sinFecha(nuevo)
    ? `${ARCHIVO}: sin cambios de contenido (solo la fecha).`
    : `${ARCHIVO} actualizado. Mesa: ${cuerpo.mesa.integrantes.map((i) => `${i.nombre} (${i.cargo})`).join(', ') || 'vacía'}.`,
);
console.log('Revisá el diff, corré npm test y commitealo.');
