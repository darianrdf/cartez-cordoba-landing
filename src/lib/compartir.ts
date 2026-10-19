/**
 * Textos y links para compartir un evento (botón «Compartir» de la página del evento). Módulo puro.
 */
import { fechaLarga } from './eventos';
import type { Evento } from './tipos';

/** "<título> · <fecha> · <lugar>", p. ej. "Jornada X · sábado 24 de octubre de 2026 · Río Cuarto". */
export function textoCompartir(evento: Pick<Evento, 'titulo' | 'fecha' | 'fechaFin' | 'lugar'>): string {
  return [evento.titulo, fechaLarga(evento.fecha, evento.fechaFin), evento.lugar].join(' · ');
}

/** Link de WhatsApp que abre el chat para elegir a quién mandarle el texto y el link. */
export function urlWhatsappCompartir(texto: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;
}
