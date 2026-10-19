import { describe, expect, it } from 'vitest';
import type { FilaEvento } from './contenido';
import { CATEGORIAS, COSTOS, FORMATOS, type Categoria } from './tipos';
import {
  convertirEventos,
  costoTexto,
  etiquetaOrganizador,
  ETIQUETAS_COSTO,
  ETIQUETAS_FORMATO,
  eventosAnteriores,
  eventosProximos,
  fechaLarga,
  finalizado,
  horario,
  imagenDeEvento,
  rutaEvento,
} from './eventos';

const porDefecto = Object.fromEntries(CATEGORIAS.map((c) => [c, `defecto-${c}`])) as Record<Categoria, string>;
const ORIGEN = 'https://ymxtvtzzkqdngsavuigl.supabase.co';
const t = (iso: string) => new Date(iso);

const fila = (f: Partial<FilaEvento> & Pick<FilaEvento, 'id' | 'fecha'>): FilaEvento => ({
  slug: `evento-${f.id}-${f.fecha}`,
  titulo: `Evento ${f.id}`,
  fecha_fin: f.fecha,
  hora_inicio: null,
  hora_fin: null,
  lugar: 'Predio',
  marco: null,
  categoria: 'rural',
  tipo: 'Rural',
  organizador: 'externo',
  organizador_nombre: null,
  organiza_comision: false,
  acompanan: [],
  comision_participa: false,
  formato: 'presencial',
  link_transmision: null,
  link: null,
  costo: null,
  costo_monto: null,
  descripcion: null,
  descripcion_larga: null,
  flyer_path: null,
  programa: [],
  ...f,
});

describe('imagenDeEvento', () => {
  it('usa la imagen si está', () => {
    expect(imagenDeEvento({ categoria: 'charla', imagen: 'img.jpg', flyer: 'flyer.jpg' }, porDefecto)).toBe('img.jpg');
  });

  it('si no hay imagen, usa el flyer', () => {
    expect(imagenDeEvento({ categoria: 'charla', flyer: 'flyer.jpg' }, porDefecto)).toBe('flyer.jpg');
  });

  it('si no hay imagen ni flyer, usa la foto de la categoría (la que eligió el tipo)', () => {
    for (const categoria of CATEGORIAS) {
      expect(imagenDeEvento({ categoria }, porDefecto)).toBe(`defecto-${categoria}`);
    }
  });
});

describe('convertirEventos', () => {
  it('convierte al tipo Evento: flyer del bucket landing, nulls como ausentes y el programa', () => {
    const [evento] = convertirEventos(ORIGEN, [
      fila({
        id: 'a',
        slug: 'expo-rural-2026-11-10',
        fecha: '2026-11-10',
        fecha_fin: '2026-11-12',
        hora_inicio: '09:00',
        marco: 'ArgenCarne 2026',
        categoria: 'rural',
        tipo: 'Exposición/Feria',
        organizador_nombre: 'Sociedad Rural',
        acompanan: ['CRA'],
        comision_participa: true,
        formato: 'hibrido',
        link_transmision: 'https://yt.example.com',
        link: 'https://expo.example.com',
        costo: 'pago',
        costo_monto: '$5.000',
        descripcion: '  Tres días  ',
        descripcion_larga: 'Uno.\nDos.',
        flyer_path: 'eventos/2026/10/a.webp',
        programa: [{ hora: null, titulo: 'Apertura', oradores: ['Ana'], moderador: null }],
      }),
    ]);
    expect(evento).toEqual({
      id: 'a',
      slug: 'expo-rural-2026-11-10',
      titulo: 'Evento a',
      fecha: '2026-11-10',
      fechaFin: '2026-11-12',
      horaInicio: '09:00',
      horaFin: undefined,
      lugar: 'Predio',
      marco: 'ArgenCarne 2026',
      tipo: 'Exposición/Feria',
      categoria: 'rural',
      organizadorNombre: 'Sociedad Rural',
      organizaComision: false,
      acompanan: ['CRA'],
      comisionParticipa: true,
      formato: 'hibrido',
      linkTransmision: 'https://yt.example.com',
      link: 'https://expo.example.com',
      costo: 'pago',
      costoMonto: '$5.000',
      descripcion: 'Tres días',
      descripcionLarga: 'Uno.\nDos.',
      flyer: `${ORIGEN}/storage/v1/object/public/landing/eventos/2026/10/a.webp`,
      programa: [{ hora: undefined, titulo: 'Apertura', oradores: ['Ana'], moderador: undefined }],
    });
  });

  it('sin flyer, la tarjeta usa la foto que eligió el tipo', () => {
    const [evento] = convertirEventos(ORIGEN, [fila({ id: 'b', fecha: '2026-11-10', categoria: 'peña', tipo: 'Peña' })]);
    expect(evento!.flyer).toBeUndefined();
    expect(imagenDeEvento(evento!, porDefecto)).toBe('defecto-peña');
  });

  it('ordena por fecha de inicio (y fin y título si empatan)', () => {
    const eventos = convertirEventos(ORIGEN, [
      fila({ id: 'c', fecha: '2026-12-01' }),
      fila({ id: 'b', fecha: '2026-11-01', fecha_fin: '2026-11-03' }),
      fila({ id: 'a', fecha: '2026-11-01' }),
    ]);
    expect(eventos.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('próximos y anteriores', () => {
  const eventos = convertirEventos(ORIGEN, [
    fila({ id: 'despues', fecha: '2026-11-01' }),
    fila({ id: 'vence-hoy', fecha: '2026-10-16', fecha_fin: '2026-10-18' }),
    fila({ id: 'ayer', fecha: '2026-10-17' }),
    fila({ id: 'hace-un-mes', fecha: '2026-09-18' }),
    fila({ id: 'antes', fecha: '2026-10-20' }),
  ]);
  const ids = (lista: { id: string }[]) => lista.map((e) => e.id);

  it('un evento termina a las 23:00 de Córdoba de su último día', () => {
    const venceHoy = eventos.find((e) => e.id === 'vence-hoy')!;
    expect(finalizado(venceHoy, t('2026-10-18T22:59:00-03:00'))).toBe(false);
    expect(finalizado(venceHoy, t('2026-10-18T23:00:00-03:00'))).toBe(true);
  });

  it('próximos: del más cercano al más lejano; anteriores: del más reciente al más viejo', () => {
    const ahora = t('2026-10-18T22:59:00-03:00');
    expect(ids(eventosProximos(eventos, ahora))).toEqual(['vence-hoy', 'antes', 'despues']);
    expect(ids(eventosAnteriores(eventos, ahora))).toEqual(['ayer', 'hace-un-mes']);
    const despues = t('2026-10-18T23:00:00-03:00');
    expect(ids(eventosProximos(eventos, despues))).toEqual(['antes', 'despues']);
    expect(ids(eventosAnteriores(eventos, despues))).toEqual(['vence-hoy', 'ayer', 'hace-un-mes']);
  });
});

describe('textos del evento', () => {
  it('horario: solo inicio, o inicio a fin', () => {
    expect(horario({})).toBeUndefined();
    expect(horario({ horaInicio: '18:00' })).toBe('18:00');
    expect(horario({ horaInicio: '18:00', horaFin: '21:30' })).toBe('18:00 a 21:30');
  });

  it('costo: con el monto solo si es pago', () => {
    expect(costoTexto({})).toBeUndefined();
    expect(costoTexto({ costo: 'gratuito', costoMonto: '$1' })).toBe('Gratuito');
    expect(costoTexto({ costo: 'pago' })).toBe('Pago');
    expect(costoTexto({ costo: 'pago', costoMonto: '$5.000' })).toBe('Pago · $5.000');
    expect(costoTexto({ costo: 'a_confirmar' })).toBe('A confirmar');
  });

  it('hay etiqueta para cada formato y cada costo', () => {
    for (const f of FORMATOS) expect(ETIQUETAS_FORMATO[f]).toBeTruthy();
    for (const c of COSTOS) expect(ETIQUETAS_COSTO[c]).toBeTruthy();
  });

  it('fecha larga, con el día de la semana de la fecha civil', () => {
    expect(fechaLarga('2026-10-24')).toBe('sábado 24 de octubre de 2026');
    expect(fechaLarga('2027-03-10', '2027-03-12')).toBe('del 10 al 12 de marzo de 2027');
    expect(fechaLarga('2027-03-30', '2027-04-02')).toBe('del 30 de marzo al 2 de abril de 2027');
    expect(fechaLarga('2026-12-30', '2027-01-02')).toBe('del 30 de diciembre de 2026 al 2 de enero de 2027');
  });

  it('la página del evento es /eventos/<slug>/', () => {
    expect(rutaEvento({ slug: 'jornada-2026-10-24' })).toBe('/eventos/jornada-2026-10-24/');
  });
});

describe('etiquetaOrganizador', () => {
  it('la Comisión tiene su propia etiqueta, aunque haya nombre', () => {
    expect(etiquetaOrganizador({ organizaComision: true, organizadorNombre: 'Comisión Córdoba' })).toBe('Organiza la Comisión');
  });

  it.each(['Ateneo CARTEZ', 'CARTEZ', 'CRA'])('organiza %s → "Organiza: %s"', (nombre) => {
    expect(etiquetaOrganizador({ organizaComision: false, organizadorNombre: nombre })).toBe(`Organiza: ${nombre}`);
  });

  it('sin nombre no hay etiqueta', () => {
    expect(etiquetaOrganizador({ organizaComision: false })).toBeUndefined();
    expect(etiquetaOrganizador({ organizaComision: false, organizadorNombre: '  ' })).toBeUndefined();
  });
});
