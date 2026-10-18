import { describe, expect, it } from 'vitest';
import type { FilaEvento } from './contenido';
import { CATEGORIAS, type Categoria } from './tipos';
import { ETIQUETAS_CATEGORIA, eventosDeContenido, imagenDeEvento } from './eventos';

const porDefecto = Object.fromEntries(CATEGORIAS.map((c) => [c, `defecto-${c}`])) as Record<Categoria, string>;

describe('imagenDeEvento', () => {
  it('usa la imagen si está', () => {
    expect(imagenDeEvento({ categoria: 'charla', imagen: 'img.jpg', flyer: 'flyer.jpg' }, porDefecto)).toBe('img.jpg');
  });

  it('si no hay imagen, usa el flyer', () => {
    expect(imagenDeEvento({ categoria: 'charla', flyer: 'flyer.jpg' }, porDefecto)).toBe('flyer.jpg');
  });

  it('si no hay imagen ni flyer, usa la foto de la categoría', () => {
    for (const categoria of CATEGORIAS) {
      expect(imagenDeEvento({ categoria }, porDefecto)).toBe(`defecto-${categoria}`);
    }
  });
});

describe('ETIQUETAS_CATEGORIA', () => {
  it('tiene etiqueta para cada categoría', () => {
    for (const categoria of CATEGORIAS) expect(ETIQUETAS_CATEGORIA[categoria]).toBeTruthy();
  });
});

describe('eventosDeContenido', () => {
  const ORIGEN = 'https://ymxtvtzzkqdngsavuigl.supabase.co';
  const fila = (f: Partial<FilaEvento> & Pick<FilaEvento, 'id' | 'fecha'>): FilaEvento => ({
    titulo: `Evento ${f.id}`,
    fecha_fin: f.fecha,
    lugar: 'Predio',
    categoria: 'rural',
    organizador: 'externo',
    link: null,
    descripcion: null,
    flyer_path: null,
    ...f,
  });
  const t = (iso: string) => new Date(iso);

  it('convierte al tipo Evento: flyer del bucket landing y los null como ausentes', () => {
    const [evento] = eventosDeContenido(
      ORIGEN,
      [
        fila({
          id: 'a',
          fecha: '2026-11-10',
          fecha_fin: '2026-11-12',
          link: 'https://expo.example.com',
          descripcion: '  Tres días  ',
          flyer_path: 'eventos/2026/10/a.webp',
        }),
      ],
      t('2026-10-18T12:00:00-03:00'),
    );
    expect(evento).toEqual({
      id: 'a',
      titulo: 'Evento a',
      fecha: '2026-11-10',
      fechaFin: '2026-11-12',
      lugar: 'Predio',
      categoria: 'rural',
      organizador: 'externo',
      link: 'https://expo.example.com',
      flyer: `${ORIGEN}/storage/v1/object/public/landing/eventos/2026/10/a.webp`,
      descripcion: 'Tres días',
    });
  });

  it('sin flyer, la tarjeta usa la foto de la categoría', () => {
    const [evento] = eventosDeContenido(ORIGEN, [fila({ id: 'b', fecha: '2026-11-10', categoria: 'peña' })], t('2026-10-18T12:00:00-03:00'));
    expect(evento!.flyer).toBeUndefined();
    expect(evento!.link).toBeUndefined();
    expect(evento!.descripcion).toBeUndefined();
    expect(imagenDeEvento(evento!, porDefecto)).toBe('defecto-peña');
  });

  it('saca los vencidos (23:00 de Córdoba del último día) y ordena por fecha de inicio', () => {
    const filas = [
      fila({ id: 'despues', fecha: '2026-11-01' }),
      fila({ id: 'vence-hoy', fecha: '2026-10-16', fecha_fin: '2026-10-18' }),
      fila({ id: 'ayer', fecha: '2026-10-17' }),
      fila({ id: 'antes', fecha: '2026-10-20' }),
    ];
    const ids = (iso: string) => eventosDeContenido(ORIGEN, filas, t(iso)).map((e) => e.id);
    expect(ids('2026-10-18T22:59:00-03:00')).toEqual(['vence-hoy', 'antes', 'despues']);
    expect(ids('2026-10-18T23:00:00-03:00')).toEqual(['antes', 'despues']);
  });
});
