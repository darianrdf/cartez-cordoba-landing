import { describe, expect, it } from 'vitest';
import { esProduccion } from './entorno';

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
