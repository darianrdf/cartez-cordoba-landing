import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { conFlyersDisponibles } from './flyers';
import type { Evento } from './tipos';

const evento = (slug: string, flyer?: string): Evento => ({
  id: slug,
  slug,
  titulo: slug,
  fecha: '2026-10-24',
  fechaFin: '2026-10-24',
  lugar: 'Córdoba',
  tipo: 'Charla',
  categoria: 'charla',
  organizaComision: false,
  acompanan: [],
  comisionParticipa: false,
  formato: 'presencial',
  programa: [],
  ...(flyer ? { flyer } : {}),
});

const BASE = 'https://ymxtvtzzkqdngsavuigl.supabase.co/storage/v1/object/public/landing/eventos';
const imagen = () => sharp({ create: { width: 40, height: 60, channels: 3, background: '#13216b' } }).webp().toBuffer();

/** fetch simulado: cada URL responde según `respuestas`. */
function fetchSimulado(respuestas: Record<string, () => Promise<Response>>) {
  return vi.fn(async (url: string | URL | Request) => respuestas[String(url)]!()) as unknown as typeof fetch;
}

describe('conFlyersDisponibles', () => {
  it('deja los flyers que bajan bien y no avisa nada', async () => {
    const ok = await imagen();
    const log = { warn: vi.fn() };
    const fetch = fetchSimulado({ [`${BASE}/ok.webp`]: async () => new Response(new Uint8Array(ok)) });
    const [e] = await conFlyersDisponibles([evento('con-flyer', `${BASE}/ok.webp`)], { fetch, log });
    expect(e?.flyer).toBe(`${BASE}/ok.webp`);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('no pide nada para los eventos sin flyer', async () => {
    const fetch = fetchSimulado({});
    const eventos = [evento('sin-flyer')];
    expect(await conFlyersDisponibles(eventos, { fetch })).toEqual(eventos);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['la descarga responde 404', async () => new Response('no está', { status: 404 }), 'la descarga respondió 404'],
    ['falla la red', async () => Promise.reject(new TypeError('fetch failed')), 'fetch failed'],
    ['el archivo no es una imagen', async () => new Response('esto no es una imagen'), 'unsupported image format'],
  ] as const)('si %s: el evento queda sin flyer (foto del tipo) y avisa', async (_caso, respuesta, motivo) => {
    const ok = await imagen();
    const log = { warn: vi.fn() };
    const fetch = fetchSimulado({
      [`${BASE}/roto.webp`]: respuesta,
      [`${BASE}/ok.webp`]: async () => new Response(new Uint8Array(ok)),
    });
    const [roto, sano] = await conFlyersDisponibles(
      [evento('evento-roto', `${BASE}/roto.webp`), evento('evento-sano', `${BASE}/ok.webp`)],
      { fetch, log },
    );
    expect(roto).not.toHaveProperty('flyer');
    expect(roto?.slug).toBe('evento-roto');
    expect(sano?.flyer).toBe(`${BASE}/ok.webp`);
    expect(log.warn).toHaveBeenCalledOnce();
    expect(log.warn.mock.calls[0]![0]).toMatch(/^\[contenido\] flyer no disponible: evento-roto \(/);
    expect(log.warn.mock.calls[0]![0]).toContain(motivo);
  });
});
