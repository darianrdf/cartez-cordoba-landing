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
};

describe('parsearSitio', () => {
  it('el sitio.json del repo es válido', () => {
    expect(() => parsearSitio(sitioJson)).not.toThrow();
  });

  it('convierte la fila plana al tipo de dominio', () => {
    const sitio = parsearSitio(filaBase);
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
    const sitio = parsearSitio({ ...filaBase, instagram: '', mail: '   ', whatsapp: null });
    expect(sitio.contacto.instagram).toBeUndefined();
    expect(sitio.contacto.mail).toBeUndefined();
    expect(sitio.contacto.whatsapp).toBeUndefined();
  });

  it('los medios de contacto pueden faltar por completo', () => {
    const { instagram, mail, whatsapp, whatsapp_mensaje, ...sinContacto } = filaBase;
    expect(parsearSitio(sinContacto).contacto).toEqual({});
  });

  it('normaliza el usuario de Instagram y el número de WhatsApp', () => {
    const sitio = parsearSitio({ ...filaBase, instagram: '@cba.ateneocartez', whatsapp: '+54 9 2954 58-8587' });
    expect(sitio.contacto.instagram).toBe('cba.ateneocartez');
    expect(sitio.contacto.whatsapp).toBe('5492954588587');
  });

  it('un WhatsApp sin dígitos cuenta como no cargado', () => {
    expect(parsearSitio({ ...filaBase, whatsapp: '-' }).contacto.whatsapp).toBeUndefined();
  });

  it('descarta objetivos vacíos', () => {
    expect(parsearSitio({ ...filaBase, objetivos: ['Uno', ' ', ''] }).objetivos).toEqual(['Uno']);
  });

  it('rechaza una fila sin nombre', () => {
    expect(() => parsearSitio({ ...filaBase, nombre: '' })).toThrow();
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
