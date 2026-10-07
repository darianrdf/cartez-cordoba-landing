import { describe, expect, it } from 'vitest';
import {
  estadoEvento,
  formatearRango,
  inicioEvento,
  isoConOffset,
  normalizarFecha,
  vencimientoEvento,
} from './fechas';

const t = (iso: string) => new Date(iso);

describe('vencimiento de un evento de un día', () => {
  const evento = { fecha: '2026-10-23' };

  it('el día anterior está próximo', () => {
    expect(estadoEvento(evento, t('2026-10-22T23:30:00-03:00'))).toBe('proximo');
  });

  it('a las 22:59 del día sigue visible (en curso)', () => {
    expect(estadoEvento(evento, t('2026-10-23T22:59:59-03:00'))).toBe('en-curso');
  });

  it('a las 23:00 del día vence', () => {
    expect(estadoEvento(evento, t('2026-10-23T23:00:00-03:00'))).toBe('vencido');
  });

  it('el día siguiente está vencido', () => {
    expect(estadoEvento(evento, t('2026-10-24T10:00:00-03:00'))).toBe('vencido');
  });
});

describe('evento de varios días', () => {
  const evento = { fecha: '2026-11-11', fechaFin: '2026-11-13' };

  it('antes de empezar está próximo', () => {
    expect(estadoEvento(evento, t('2026-11-10T23:59:00-03:00'))).toBe('proximo');
  });

  it('desde las 00:00 del primer día está en curso', () => {
    expect(estadoEvento(evento, t('2026-11-11T00:00:00-03:00'))).toBe('en-curso');
  });

  it('en el día del medio está en curso', () => {
    expect(estadoEvento(evento, t('2026-11-12T15:00:00-03:00'))).toBe('en-curso');
  });

  it('vence a las 23:00 del último día', () => {
    expect(estadoEvento(evento, t('2026-11-13T22:59:00-03:00'))).toBe('en-curso');
    expect(estadoEvento(evento, t('2026-11-13T23:00:00-03:00'))).toBe('vencido');
  });
});

describe('evento que cruza de mes', () => {
  const evento = { fecha: '2027-01-30', fechaFin: '2027-02-02' };

  it('está en curso el 1 de febrero y vence el 2 a las 23:00', () => {
    expect(estadoEvento(evento, t('2027-02-01T12:00:00-03:00'))).toBe('en-curso');
    expect(estadoEvento(evento, t('2027-02-02T23:00:00-03:00'))).toBe('vencido');
  });

  it('se formatea con ambos meses', () => {
    expect(formatearRango('2027-01-30', '2027-02-02')).toBe('30 ene – 2 feb');
  });
});

describe('instantes cercanos a medianoche UTC', () => {
  const evento = { fecha: '2026-10-23' };

  it('a las 01:30 UTC del 24 todavía son las 22:30 del 23 en Córdoba: sigue en curso', () => {
    expect(estadoEvento(evento, t('2026-10-24T01:30:00Z'))).toBe('en-curso');
  });

  it('a las 02:00 UTC del 24 son las 23:00 del 23 en Córdoba: vencido', () => {
    expect(estadoEvento(evento, t('2026-10-24T02:00:00Z'))).toBe('vencido');
  });

  it('a las 00:30 UTC del 23 todavía es el 22 en Córdoba: próximo', () => {
    expect(estadoEvento(evento, t('2026-10-23T00:30:00Z'))).toBe('proximo');
  });

  it('una fecha YAML (medianoche UTC) se normaliza al mismo día civil', () => {
    expect(normalizarFecha(new Date('2026-10-23'))).toBe('2026-10-23');
    expect(normalizarFecha(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23');
  });
});

describe('instantes e ISO con offset', () => {
  it('inicio y vencimiento en hora de Córdoba', () => {
    expect(inicioEvento('2026-10-23').toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(vencimientoEvento('2026-10-23').toISOString()).toBe('2026-10-24T02:00:00.000Z');
  });

  it('isoConOffset muestra la hora local con offset', () => {
    expect(isoConOffset(vencimientoEvento('2026-10-23'))).toBe('2026-10-23T23:00:00-03:00');
  });

  it('rechaza fechas mal formadas', () => {
    expect(() => normalizarFecha('23/10/2026')).toThrow();
  });
});

describe('formatearRango', () => {
  it('un día', () => expect(formatearRango('2026-10-23')).toBe('23 oct'));
  it('un día con fechaFin igual', () => expect(formatearRango('2026-10-23', '2026-10-23')).toBe('23 oct'));
  it('mismo mes', () => expect(formatearRango('2027-01-10', '2027-01-12')).toBe('10–12 ene'));
  it('distinto mes', () => expect(formatearRango('2027-01-30', '2027-02-02')).toBe('30 ene – 2 feb'));
});
