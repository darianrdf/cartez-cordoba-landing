import { describe, expect, it, vi } from 'vitest';
import snapshot from '../data/sitio.json';
import { contenidoSchema, mismoContenido, obtenerContenido, urlStorage, type OpcionesContenido } from './contenido';

const PROD = 'https://ymxtvtzzkqdngsavuigl.supabase.co';
const DEV = 'https://gaibxlhpjeslqyyfkoho.supabase.co';

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

describe('urlStorage', () => {
  it('arma la URL pública del bucket galeria', () => {
    expect(urlStorage(PROD, 'mesa/2026/ana.webp')).toBe(
      `${PROD}/storage/v1/object/public/galeria/mesa/2026/ana.webp`,
    );
  });
});

describe('mismoContenido', () => {
  const base = contenidoSchema.parse(snapshot);
  it('ignora la fecha de generación', () => {
    expect(mismoContenido(base, { ...base, generado_en: 'otra' })).toBe(true);
  });
  it('detecta un cambio en la mesa', () => {
    expect(mismoContenido(base, { ...base, mesa: { ...base.mesa, etapa: '2030' } })).toBe(false);
  });
});
