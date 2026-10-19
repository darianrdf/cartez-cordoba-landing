import { describe, expect, it } from 'vitest';
import { textoCompartir, urlWhatsappCompartir } from './compartir';

describe('textoCompartir', () => {
  it('un día', () => {
    expect(textoCompartir({ titulo: 'Jornada X', fecha: '2026-10-24', fechaFin: '2026-10-24', lugar: 'Río Cuarto' })).toBe(
      'Jornada X · sábado 24 de octubre de 2026 · Río Cuarto',
    );
  });

  it('varios días', () => {
    expect(textoCompartir({ titulo: 'Congreso', fecha: '2026-10-20', fechaFin: '2026-10-25', lugar: 'Sociedad Rural' })).toBe(
      'Congreso · del 20 al 25 de octubre de 2026 · Sociedad Rural',
    );
  });
});

describe('urlWhatsappCompartir', () => {
  it('codifica el texto y el link en un solo mensaje', () => {
    const url = urlWhatsappCompartir('Peña & guitarreada · Córdoba', 'https://ateneo-cartez-cordoba.pages.dev/eventos/pena/');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe(
      'Peña & guitarreada · Córdoba\nhttps://ateneo-cartez-cordoba.pages.dev/eventos/pena/',
    );
    expect(url).not.toMatch(/[ &\n]/);
  });
});
