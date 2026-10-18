import { describe, expect, it, vi } from 'vitest';
import snapshot from '../data/sitio.json';
import {
  contenidoSchema,
  eventosValidos,
  mismoContenido,
  obtenerContenido,
  urlStorage,
  type OpcionesContenido,
} from './contenido';

const PROD = 'https://ymxtvtzzkqdngsavuigl.supabase.co';
const DEV = 'https://gaibxlhpjeslqyyfkoho.supabase.co';

/** Un evento como lo devuelve contenido_landing(). */
const EVENTO = {
  id: '6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60',
  slug: 'expo-rural-2026-11-10',
  titulo: 'Expo Rural',
  fecha: '2026-11-10',
  fecha_fin: '2026-11-12',
  hora_inicio: '09:00',
  hora_fin: null,
  lugar: 'Predio ferial',
  marco: null,
  categoria: 'rural',
  tipo: 'Exposición/Feria',
  organizador: 'externo',
  organizador_nombre: 'Sociedad Rural',
  organiza_comision: false,
  acompanan: ['CRA'],
  comision_participa: true,
  formato: 'presencial',
  link_transmision: null,
  link: 'https://expo.example.com',
  costo: 'gratuito',
  costo_monto: null,
  descripcion: null,
  descripcion_larga: null,
  flyer_path: 'eventos/2026/10/6f1c2a4e.webp',
  programa: [{ hora: '09:00', titulo: 'Apertura', oradores: ['Ana Prueba'], moderador: null }],
};

/** Lo que devuelve contenido_landing() (sin `origen`, que lo agrega la landing). */
function respuestaDe(cambios: Record<string, unknown> = {}) {
  const { origen: _, ...resto } = structuredClone(snapshot);
  return { ...resto, entorno: 'dev', generado_en: '2026-10-17T12:00:00-03:00', ...cambios };
}

function respuestaHttp(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

function opciones(cambios: Partial<OpcionesContenido> = {}) {
  const log = { info: vi.fn(), warn: vi.fn() };
  return {
    log,
    opciones: { url: DEV, clave: 'clave-publica', snapshot, log, ...cambios } satisfies OpcionesContenido,
  };
}

describe('obtenerContenido', () => {
  it('lee contenido_landing() con la clave pública y agrega el origen', async () => {
    const fetch = vi.fn(async () => respuestaHttp(respuestaDe()));
    const { log, opciones: o } = opciones({ fetch });
    const contenido = await obtenerContenido(o);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${DEV}/rest/v1/rpc/contenido_landing`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ apikey: 'clave-publica', 'Content-Type': 'application/json' });
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(contenido.origen).toBe(DEV);
    expect(contenido.entorno).toBe('dev');
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('[contenido] Supabase OK (dev)'));
  });

  it('acepta la URL con barra final o espacios', async () => {
    const fetch = vi.fn(async () => respuestaHttp(respuestaDe()));
    const { opciones: o } = opciones({ fetch, url: ` ${DEV}/ ` });
    expect((await obtenerContenido(o)).origen).toBe(DEV);
  });

  it('descarta claves que no están en el contrato (nunca llegan a la página)', async () => {
    const respuesta = respuestaDe();
    respuesta.mesa = {
      ...respuesta.mesa,
      integrantes: respuesta.mesa.integrantes.map((i) => ({ ...i, mail: 'privado@tests.invalid', telefono: '351' })),
    };
    const fetch = vi.fn(async () => respuestaHttp({ ...respuesta, otra_cosa: 1 }));
    const contenido = await obtenerContenido(opciones({ fetch }).opciones);
    expect(JSON.stringify(contenido)).not.toMatch(/privado@tests\.invalid|telefono|otra_cosa/);
    expect(Object.keys(contenido.mesa.integrantes[0]!).sort()).toEqual(['cargo', 'foto_path', 'nombre', 'orden']);
  });

  it('avisa si el snapshot versionado quedó viejo (mismo entorno)', async () => {
    const fetch = vi.fn(async () =>
      respuestaHttp(respuestaDe({ entorno: 'prod', mesa: { etapa: '2027', integrantes: [] } })),
    );
    const { log, opciones: o } = opciones({ fetch, url: PROD });
    await obtenerContenido(o);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('el snapshot versionado difiere'));
  });

  it('dice que el snapshot está al día si solo cambia la fecha', async () => {
    const fetch = vi.fn(async () => respuestaHttp(respuestaDe({ entorno: 'prod' })));
    const { log, opciones: o } = opciones({ fetch, url: PROD });
    await obtenerContenido(o);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('snapshot al día'));
  });

  describe('si no se puede leer, usa el snapshot y deja un aviso (el build no se rompe)', () => {
    async function caeAlSnapshot(cambios: Partial<OpcionesContenido>, motivo: RegExp) {
      const { log, opciones: o } = opciones(cambios);
      const contenido = await obtenerContenido(o);
      expect(contenido).toEqual(contenidoSchema.parse(snapshot));
      expect(log.warn).toHaveBeenCalledOnce();
      const aviso = log.warn.mock.calls[0]![0] as string;
      expect(aviso).toMatch(/^\[contenido\] ⚠ No se pudo leer Supabase/);
      expect(aviso).toMatch(motivo);
      expect(aviso).toContain(snapshot.generado_en);
    }

    it('faltan las variables de entorno', async () => {
      const fetch = vi.fn();
      await caeAlSnapshot({ url: undefined, fetch }, /faltan SUPABASE_URL o SUPABASE_ANON_KEY/);
      await caeAlSnapshot({ clave: '  ', fetch }, /faltan SUPABASE_URL o SUPABASE_ANON_KEY/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('la URL no es de cartez-prod ni de cartez-dev', async () => {
      const fetch = vi.fn();
      await caeAlSnapshot({ url: 'https://otro.supabase.co', fetch }, /proyecto no permitido: otro\.supabase\.co/);
      await caeAlSnapshot({ url: 'no es una url', fetch }, /no es una URL/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('Supabase no responde a tiempo', async () => {
      // fetch que solo termina cuando se aborta (como uno colgado).
      const fetch = vi.fn(
        (_: string, init?: RequestInit) =>
          new Promise<Response>((_resolver, rechazar) =>
            init?.signal?.addEventListener('abort', () => rechazar(init.signal?.reason)),
          ),
      );
      await caeAlSnapshot({ fetch: fetch as unknown as typeof globalThis.fetch, timeoutMs: 20 }, /no respondió en 0\.02 s/);
    });

    it('la API responde un error (por ejemplo, proyecto pausado)', async () => {
      const fetch = vi.fn(async () => respuestaHttp({ message: 'error' }, 500));
      await caeAlSnapshot({ fetch }, /la API respondió 500/);
    });

    it('falta la lista de eventos, o no es una lista', async () => {
      const { eventos: _, ...sinEventos } = respuestaDe();
      await caeAlSnapshot({ fetch: vi.fn(async () => respuestaHttp(sinEventos)) }, /respuesta inválida en eventos/);
      await caeAlSnapshot(
        { fetch: vi.fn(async () => respuestaHttp(respuestaDe({ eventos: { 0: EVENTO } }))) },
        /respuesta inválida en eventos/,
      );
    });

    it('la respuesta no cumple el contrato', async () => {
      const fetch = vi.fn(async () => respuestaHttp(respuestaDe({ version: 2 })));
      await caeAlSnapshot({ fetch }, /respuesta inválida en version/);
    });

    it('la respuesta no es JSON', async () => {
      const fetch = vi.fn(async () => new Response('<html>', { status: 200 }));
      await caeAlSnapshot({ fetch }, /la respuesta no es JSON/);
    });

    it('falla la red', async () => {
      const fetch = vi.fn(async () => {
        throw new TypeError('fetch failed');
      });
      await caeAlSnapshot({ fetch }, /error de red: fetch failed/);
    });
  });

  it('un snapshot versionado inválido sí rompe (error de código, lo atajan los tests)', async () => {
    const { opciones: o } = opciones({ snapshot: { ...snapshot, version: 2 } });
    await expect(obtenerContenido(o)).rejects.toThrow();
  });
});

describe('eventos', () => {
  it('trae los eventos válidos de la respuesta', async () => {
    const fetch = vi.fn(async () => respuestaHttp(respuestaDe({ eventos: [EVENTO] })));
    const { log, opciones: o } = opciones({ fetch });
    const contenido = await obtenerContenido(o);
    expect(contenido.eventos).toEqual([EVENTO]);
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('1 eventos'));
  });

  it('un evento sin las claves de D-24 (base sin migrar) o con un programa mal armado se descarta', () => {
    const { slug: _, programa: __, ...deD23 } = EVENTO;
    const log = { warn: vi.fn() };
    const malPrograma = { ...EVENTO, id: '44444444-4444-4444-8444-444444444444', programa: [{ titulo: '' }] };
    expect(eventosValidos([deD23, malPrograma, EVENTO], log)).toEqual([EVENTO]);
    expect(log.warn).toHaveBeenCalledTimes(2);
    expect(String(log.warn.mock.calls[1]![0])).toContain('44444444-4444-4444-8444-444444444444 (programa.0.');
  });

  it('descarta solo los eventos inválidos, con un aviso cada uno, y usa los demás', async () => {
    const malos = [
      { ...EVENTO, id: '11111111-1111-4111-8111-111111111111', categoria: 'fiesta' },
      { ...EVENTO, id: '22222222-2222-4222-8222-222222222222', fecha_fin: '2026-11-09' },
      { ...EVENTO, id: undefined },
      { ...EVENTO, id: '33333333-3333-4333-8333-333333333333', flyer_path: 'galeria/../x.webp' },
    ];
    const fetch = vi.fn(async () => respuestaHttp(respuestaDe({ eventos: [malos[0], EVENTO, ...malos.slice(1)] })));
    const { log, opciones: o } = opciones({ fetch });
    const contenido = await obtenerContenido(o);

    expect(contenido.origen).toBe(DEV);
    expect(contenido.eventos).toEqual([EVENTO]);
    const avisos = log.warn.mock.calls.map(([texto]) => texto as string);
    expect(avisos).toHaveLength(4);
    for (const aviso of avisos) expect(aviso.startsWith('[contenido] evento descartado: ')).toBe(true);
    expect(avisos[0]).toContain('descartado: 11111111-1111-4111-8111-111111111111 (categoria: ');
    expect(avisos[1]).toContain('22222222-2222-4222-8222-222222222222 (fecha_fin: fecha_fin es anterior a fecha)');
    // Un id undefined no sobrevive al JSON de la respuesta: la fila llega sin id.
    expect(avisos[2]).toContain('descartado: (sin id) (id: ');
    expect(avisos[3]).toContain('33333333-3333-4333-8333-333333333333 (flyer_path: ');
    // No cayó al snapshot.
    expect(avisos.some((a) => a.includes('No se pudo leer Supabase'))).toBe(false);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('[contenido] Supabase OK (dev)'));
  });

  it('eventosValidos() avisa con "(sin id)" si la fila ni siquiera es un objeto', () => {
    const log = { warn: vi.fn() };
    expect(eventosValidos([null, 'texto', EVENTO], log)).toEqual([EVENTO]);
    expect(log.warn).toHaveBeenCalledTimes(2);
    expect(String(log.warn.mock.calls[0]![0]).startsWith('[contenido] evento descartado: (sin id) (')).toBe(true);
  });
});

describe('urlStorage', () => {
  it('arma la URL pública del bucket galeria (mesa)', () => {
    expect(urlStorage(PROD, 'galeria', 'mesa/2026/ana.webp')).toBe(
      `${PROD}/storage/v1/object/public/galeria/mesa/2026/ana.webp`,
    );
  });

  it('arma la URL pública del bucket landing (flyers)', () => {
    expect(urlStorage(DEV, 'landing', 'eventos/2026/10/x.webp')).toBe(
      `${DEV}/storage/v1/object/public/landing/eventos/2026/10/x.webp`,
    );
  });
});

describe('mismoContenido', () => {
  const crudo = contenidoSchema.parse(snapshot);
  const base = { ...crudo, eventos: eventosValidos(crudo.eventos, { warn: vi.fn() }) };
  it('ignora la fecha de generación', () => {
    expect(mismoContenido(base, { ...base, generado_en: 'otra' })).toBe(true);
  });
  it('detecta un cambio en la mesa', () => {
    expect(mismoContenido(base, { ...base, mesa: { ...base.mesa, etapa: '2030' } })).toBe(false);
  });
});
