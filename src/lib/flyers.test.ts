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

type Respuesta = () => Promise<Response>;

/**
 * fetch simulado: cada URL responde según `respuestas`. Con una lista, cada pedido usa la
 * siguiente (el último se repite).
 */
function fetchSimulado(respuestas: Record<string, Respuesta | Respuesta[]>) {
  const pedidos: Record<string, number> = {};
  return vi.fn(async (url: string | URL | Request) => {
    const clave = String(url);
    const lista = ([] as Respuesta[]).concat(respuestas[clave]!);
    const n = (pedidos[clave] = (pedidos[clave] ?? 0) + 1);
    return lista[Math.min(n, lista.length) - 1]!();
  }) as unknown as typeof fetch;
}

/** Espera simulada (el reintento real espera ~2 s). */
const esperaSimulada = () => vi.fn(async (_ms: number) => undefined);

const ERROR_RED = async () => Promise.reject(new TypeError('fetch failed'));
const ERROR_503 = async () => new Response('caído', { status: 503 });
const NO_ESTA = async () => new Response('no está', { status: 404 });
const NO_ES_IMAGEN = async () => new Response('esto no es una imagen');

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
    ['la descarga responde 404 (sin reintento)', NO_ESTA, 'la descarga respondió 404', 1],
    ['el archivo no es una imagen (sin reintento)', NO_ES_IMAGEN, 'unsupported image format', 1],
    ['falla la red dos veces', ERROR_RED, 'fetch failed', 2],
    ['Storage responde 503 dos veces', ERROR_503, 'la descarga respondió 503', 2],
  ] as const)('si %s: el evento queda sin flyer (foto del tipo) y avisa', async (_caso, respuesta, motivo, pedidos) => {
    const ok = await imagen();
    const log = { warn: vi.fn() };
    const esperar = esperaSimulada();
    const fetch = fetchSimulado({
      [`${BASE}/roto.webp`]: respuesta,
      [`${BASE}/ok.webp`]: async () => new Response(new Uint8Array(ok)),
    });
    const [roto, sano] = await conFlyersDisponibles(
      [evento('evento-roto', `${BASE}/roto.webp`), evento('evento-sano', `${BASE}/ok.webp`)],
      { fetch, log, esperar },
    );
    expect(fetch).toHaveBeenCalledTimes(pedidos + 1); // + el flyer sano
    expect(esperar).toHaveBeenCalledTimes(pedidos - 1);
    expect(roto).not.toHaveProperty('flyer');
    expect(roto?.slug).toBe('evento-roto');
    expect(sano?.flyer).toBe(`${BASE}/ok.webp`);
    expect(log.warn).toHaveBeenCalledOnce();
    expect(log.warn.mock.calls[0]![0]).toMatch(/^\[contenido\] flyer no disponible: evento-roto \(/);
    expect(log.warn.mock.calls[0]![0]).toContain(motivo);
  });

  it.each([
    ['falla la red', ERROR_RED],
    ['Storage responde 503', ERROR_503],
  ] as const)('si %s y al reintentar anda: conserva el flyer, sin aviso', async (_caso, primera) => {
    const ok = await imagen();
    const log = { warn: vi.fn() };
    const esperar = esperaSimulada();
    const fetch = fetchSimulado({ [`${BASE}/intermitente.webp`]: [primera, async () => new Response(new Uint8Array(ok))] });
    const [e] = await conFlyersDisponibles([evento('intermitente', `${BASE}/intermitente.webp`)], { fetch, log, esperar });
    expect(e?.flyer).toBe(`${BASE}/intermitente.webp`);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledExactlyOnceWith(2_000);
    expect(log.warn).not.toHaveBeenCalled();
  });
});
