import { describe, expect, it } from 'vitest';
import { CATEGORIAS, type Categoria } from './tipos';
import { ETIQUETAS_CATEGORIA, imagenDeEvento } from './eventos';

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
