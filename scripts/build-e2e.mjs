/**
 * Build para los tests e2e (`npm run test:e2e`): contenido fijo, sin leer Supabase, en dist-e2e/.
 * Parte del snapshot (textos y mesa de prod) y le agrega eventos de prueba con fechas relativas
 * a hoy en Córdoba: uno próximo con el lugar largo que desbordaba en celular, uno de la Comisión
 * y uno terminado. Así los tests no dependen de qué eventos haya cargados en dev o en prod.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../src/data/sitio.json', import.meta.url), 'utf8'));

/** Fecha civil de hoy + `dias` en Córdoba (YYYY-MM-DD). */
function dia(dias) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba' }).format(new Date());
  const [a, m, d] = hoy.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

const base = {
  hora_inicio: '09:00',
  hora_fin: '18:00',
  marco: null,
  acompanan: [],
  comision_participa: false,
  formato: 'presencial',
  link_transmision: null,
  link: null,
  costo: null,
  costo_monto: null,
  descripcion_larga: null,
  flyer_path: null,
  programa: [],
};

const eventos = [
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'jornada-de-gremialismo-agropecuario',
    titulo: 'Jornada de Gremialismo Agropecuario',
    fecha: dia(3),
    fecha_fin: dia(5),
    lugar: 'Sociedad Rural de Río Cuarto, Río Cuarto, Córdoba',
    marco: 'ArgenCarne Río Cuarto',
    categoria: 'congreso',
    tipo: 'Congreso',
    organizador: 'externo',
    organizador_nombre: 'Ateneo CARTEZ',
    organiza_comision: false,
    comision_participa: true,
    acompanan: ['Confederación de Asociaciones Rurales de Buenos Aires y La Pampa', 'Sociedad Rural de Río Cuarto'],
    link: 'https://example.com/inscripcion',
    costo: 'gratuito',
    descripcion:
      'Jornada de formación para jóvenes dirigentes rurales: gremialismo, liderazgo, recambio generacional, negociación y comunicación del agro.',
    descripcion_larga: 'Primer párrafo.\nSegundo párrafo.',
    programa: [
      { hora: '09:00', titulo: 'Acreditación', oradores: [], moderador: null },
      { hora: '10:00', titulo: 'Panel de gremialismo', oradores: ['Persona Uno', 'Persona Dos'], moderador: 'Persona Tres' },
    ],
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'pena-de-la-comision',
    titulo: 'Peña de la Comisión',
    fecha: dia(10),
    fecha_fin: dia(10),
    hora_fin: null,
    lugar: 'Córdoba',
    categoria: 'peña',
    tipo: 'Peña',
    organizador: 'propio',
    organizador_nombre: 'Comisión Córdoba',
    organiza_comision: true,
    descripcion: 'Encuentro para conocernos.',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    slug: 'charla-cra',
    titulo: 'Charla de CRA sobre mercados',
    fecha: dia(-30),
    fecha_fin: dia(-30),
    lugar: 'Jesús María',
    categoria: 'charla',
    tipo: 'Charla',
    organizador: 'externo',
    organizador_nombre: 'CRA',
    organiza_comision: false,
    descripcion: null,
  },
  {
    // Flyer que no existe en Storage: el build no se rompe y el evento usa la foto del tipo
    // (conFlyersDisponibles). Sin red pasa lo mismo.
    ...base,
    id: '00000000-0000-4000-8000-000000000004',
    slug: 'visita-con-flyer-roto',
    titulo: 'Visita a campo',
    fecha: dia(20),
    fecha_fin: dia(20),
    lugar: 'Villa María',
    categoria: 'visita',
    tipo: 'Visita',
    organizador: 'externo',
    organizador_nombre: 'Ateneo CARTEZ',
    organiza_comision: false,
    descripcion: 'Recorrida por un establecimiento ganadero.',
    flyer_path: 'eventos/e2e/no-existe.webp',
  },
];

mkdirSync('.e2e', { recursive: true });
writeFileSync('.e2e/contenido.json', JSON.stringify({ ...snapshot, eventos }, null, 2));

const { status } = spawnSync('npx', ['astro', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CONTENIDO_E2E: '.e2e/contenido.json' },
});
process.exit(status ?? 1);
