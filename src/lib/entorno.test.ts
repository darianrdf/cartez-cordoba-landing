import { describe, expect, it } from 'vitest';
import { esProduccion, siteDeRama, SITIO_PRODUCCION } from './entorno';

describe('esProduccion', () => {
  it('solo la rama main con datos de prod es producción', () => {
    expect(esProduccion('main', 'prod')).toBe(true);
  });

  it.each([
    ['dev', 'dev'],
    ['dev', 'prod'],
    ['main', 'dev'],
    [undefined, 'prod'],
    [undefined, 'dev'],
    ['', 'prod'],
  ] as const)('rama %j con datos de %s no es producción (noindex)', (rama, entorno) => {
    expect(esProduccion(rama, entorno)).toBe(false);
  });
});

describe('siteDeRama', () => {
  it.each([undefined, '', 'main'])('rama %j → producción', (rama) => {
    expect(siteDeRama(rama)).toBe(SITIO_PRODUCCION);
  });

  it('dev → su preview fijo', () => {
    expect(siteDeRama('dev')).toBe('https://dev.ateneo-cartez-cordoba.pages.dev');
  });

  it('otras ramas → alias de Cloudflare (minúsculas, guiones, 28 caracteres)', () => {
    expect(siteDeRama('feat/Compartir')).toBe('https://feat-compartir.ateneo-cartez-cordoba.pages.dev');
    expect(siteDeRama('una-rama-con-un-nombre-muy-largo-de-verdad')).toBe(
      'https://una-rama-con-un-nombre-muy-l.ateneo-cartez-cordoba.pages.dev',
    );
  });
});
