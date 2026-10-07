import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sitioJson from '../data/sitio.json';
import { instagramUrl, mailtoUrl, nombreCompleto, parsearSitio, whatsappUrl, type FilaSitio } from './sitio';

const filaBase: FilaSitio = {
  nombre: 'Comisión Córdoba',
  organizacion: 'Ateneo CARTEZ',
  descripcion_meta: 'Descripción',
  hero_frase: 'Frase',
  instagram: 'cba.ateneocartez',
  mail: 'comisioncordobaateneocartez@gmail.com',
  whatsapp: '5492954588587',
  whatsapp_mensaje: 'Hola, quiero sumarme a la Comisión Córdoba',
  conocenos_ateneo_titulo: 'A',
  conocenos_ateneo_texto: 'a',
  conocenos_comision_titulo: 'C',
  conocenos_comision_texto: 'c',
  objetivos: ['Uno', 'Dos'],
  hero_imagen_escritorio: 'hero.jpg',
  hero_imagen_celular: 'https://xyz.supabase.co/storage/v1/object/public/fotos/hero.webp',
  franja_imagen: 'franja.jpg',
  franja_frase: '  Frase de la franja  ',
};

/** Resolver de prueba: devuelve la referencia tal cual. */
const parsear = (fila: unknown) => parsearSitio(fila, (ref) => ref);

describe('parsearSitio', () => {
  it('el sitio.json del repo es válido', () => {
    expect(() => parsear(sitioJson)).not.toThrow();
  });

  it('convierte la fila plana al tipo de dominio', () => {
    const sitio = parsear(filaBase);
    expect(sitio.contacto).toEqual({
      instagram: 'cba.ateneocartez',
      mail: 'comisioncordobaateneocartez@gmail.com',
      whatsapp: '5492954588587',
      whatsappMensaje: 'Hola, quiero sumarme a la Comisión Córdoba',
    });
    expect(sitio.conocenos.ateneo).toEqual({ titulo: 'A', texto: 'a' });
    expect(nombreCompleto(sitio)).toBe('Comisión Córdoba – Ateneo CARTEZ');
  });

  it('los medios de contacto vacíos, en blanco o null quedan sin cargar', () => {
    const sitio = parsear({ ...filaBase, instagram: '', mail: '   ', whatsapp: null });
    expect(sitio.contacto.instagram).toBeUndefined();
    expect(sitio.contacto.mail).toBeUndefined();
    expect(sitio.contacto.whatsapp).toBeUndefined();
  });

  it('los medios de contacto pueden faltar por completo', () => {
    const { instagram, mail, whatsapp, whatsapp_mensaje, ...sinContacto } = filaBase;
    expect(parsear(sinContacto).contacto).toEqual({});
  });

  it('normaliza el usuario de Instagram y el número de WhatsApp', () => {
    const sitio = parsear({ ...filaBase, instagram: '@cba.ateneocartez', whatsapp: '+54 9 2954 58-8587' });
    expect(sitio.contacto.instagram).toBe('cba.ateneocartez');
    expect(sitio.contacto.whatsapp).toBe('5492954588587');
  });

  it('un WhatsApp sin dígitos cuenta como no cargado', () => {
    expect(parsear({ ...filaBase, whatsapp: '-' }).contacto.whatsapp).toBeUndefined();
  });

  it('descarta objetivos vacíos', () => {
    expect(parsear({ ...filaBase, objetivos: ['Uno', ' ', ''] }).objetivos).toEqual(['Uno']);
  });

  it('rechaza una fila sin nombre', () => {
    expect(() => parsear({ ...filaBase, nombre: '' })).toThrow();
  });
});

describe('imágenes del sitio', () => {
  it('acepta nombres de archivo y URLs https, y las pasa por el resolver', () => {
    const sitio = parsearSitio(filaBase, (ref) => `resuelta:${ref}`);
    expect(sitio.imagenes).toEqual({
      heroEscritorio: 'resuelta:hero.jpg',
      heroCelular: 'resuelta:https://xyz.supabase.co/storage/v1/object/public/fotos/hero.webp',
      franja: 'resuelta:franja.jpg',
    });
    expect(sitio.franjaFrase).toBe('Frase de la franja');
  });

  it.each(['http://inseguro.com/a.jpg', '../fuera.jpg', 'carpeta/foto.jpg', 'foto.gif', ''])(
    'rechaza la referencia %j',
    (ref) => {
      expect(() => parsear({ ...filaBase, franja_imagen: ref })).toThrow();
    },
  );

  it('las fotos locales que referencia sitio.json existen', () => {
    const refs = [sitioJson.hero_imagen_escritorio, sitioJson.hero_imagen_celular, sitioJson.franja_imagen];
    for (const ref of refs.filter((r) => !r.startsWith('https://'))) {
      expect(existsSync(new URL(`../assets/fotos/${ref}`, import.meta.url)), ref).toBe(true);
    }
  });
});

describe('URLs de contacto', () => {
  it('WhatsApp con mensaje precargado', () => {
    expect(whatsappUrl('5492954588587', 'Hola, quiero sumarme a la Comisión Córdoba')).toBe(
      'https://wa.me/5492954588587?text=Hola%2C%20quiero%20sumarme%20a%20la%20Comisi%C3%B3n%20C%C3%B3rdoba',
    );
  });

  it('WhatsApp sin mensaje', () => {
    expect(whatsappUrl('5492954588587')).toBe('https://wa.me/5492954588587');
  });

  it('Instagram', () => {
    expect(instagramUrl('cba.ateneocartez')).toBe('https://instagram.com/cba.ateneocartez');
  });

  it('Mail', () => {
    expect(mailtoUrl('comisioncordobaateneocartez@gmail.com')).toBe('mailto:comisioncordobaateneocartez@gmail.com');
  });
});
