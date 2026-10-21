import { describe, expect, it } from 'vitest';
import { mezclar } from './mezclar';

describe('mezclar', () => {
  it('devuelve los mismos elementos, sin cambiar la lista original', () => {
    const lista = ['Pedro', 'Lucas', 'Ana', 'Eva'];
    const mezclada = mezclar(lista);
    expect([...mezclada].sort()).toEqual([...lista].sort());
    expect(lista).toEqual(['Pedro', 'Lucas', 'Ana', 'Eva']);
  });

  it('con un azar fijo da siempre el mismo orden', () => {
    expect(mezclar(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    expect(mezclar(['a', 'b', 'c'], () => 0.999)).toEqual(['a', 'b', 'c']);
  });

  it('cada elemento puede quedar primero (no hay uno favorecido)', () => {
    const primeros = new Set<string>();
    for (const r of [0, 0.34, 0.67, 0.99]) primeros.add(mezclar(['a', 'b', 'c'], () => r)[0]!);
    expect(primeros).toEqual(new Set(['a', 'b', 'c']));
  });

  it('una lista vacía o de un elemento queda igual', () => {
    expect(mezclar([])).toEqual([]);
    expect(mezclar(['Pedro'])).toEqual(['Pedro']);
  });
});
