import { urlStorage, type FilaEvento } from './contenido';
import { estadoEvento } from './fechas';
import type { Categoria, Costo, Evento, Formato, Imagen } from './tipos';

export const ETIQUETAS_FORMATO: Record<Formato, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrido: 'Híbrido (presencial y virtual)',
};

export const ETIQUETAS_COSTO: Record<Costo, string> = {
  gratuito: 'Gratuito',
  pago: 'Pago',
  a_confirmar: 'A confirmar',
};

/**
 * Imagen de la tarjeta de un evento. Prioridad: `imagen` → `flyer` → foto por defecto de la
 * categoría (las fotos por defecto se definen en src/lib/fotos.ts).
 */
export function imagenDeEvento<T extends Imagen>(
  evento: Pick<Evento, 'imagen' | 'flyer' | 'categoria'>,
  porDefecto: Record<Categoria, T>,
): Imagen {
  return evento.imagen ?? evento.flyer ?? porDefecto[evento.categoria];
}

const opcional = <T>(v: T | null): T | undefined => v ?? undefined;
const textoOpcional = (v: string | null) => v?.trim() || undefined;

/** Eventos de contenido_landing() → tipo de dominio, ordenados por fecha de inicio. */
export function convertirEventos(origen: string, filas: readonly FilaEvento[]): Evento[] {
  return filas
    .map(
      (f): Evento => ({
        id: f.id,
        slug: f.slug,
        titulo: f.titulo,
        fecha: f.fecha,
        fechaFin: f.fecha_fin,
        horaInicio: opcional(f.hora_inicio),
        horaFin: opcional(f.hora_fin),
        lugar: f.lugar,
        marco: opcional(f.marco),
        tipo: f.tipo,
        categoria: f.categoria,
        organizadorNombre: opcional(f.organizador_nombre),
        organizaComision: f.organiza_comision,
        acompanan: f.acompanan,
        comisionParticipa: f.comision_participa,
        formato: f.formato,
        linkTransmision: opcional(f.link_transmision),
        link: opcional(f.link),
        costo: opcional(f.costo),
        costoMonto: opcional(f.costo_monto),
        descripcion: textoOpcional(f.descripcion),
        descripcionLarga: textoOpcional(f.descripcion_larga),
        flyer: f.flyer_path ? urlStorage(origen, 'landing', f.flyer_path) : undefined,
        programa: f.programa.map((b) => ({
          hora: opcional(b.hora),
          titulo: b.titulo,
          oradores: b.oradores,
          moderador: opcional(b.moderador),
        })),
      }),
    )
    .sort(porFecha);
}

function porFecha(a: Evento, b: Evento): number {
  return a.fecha.localeCompare(b.fecha) || a.fechaFin.localeCompare(b.fechaFin) || a.titulo.localeCompare(b.titulo);
}

/** Terminó: pasaron las 23 h (Córdoba) de su último día. */
export function finalizado(evento: Pick<Evento, 'fecha' | 'fechaFin'>, ahora: Date): boolean {
  return estadoEvento(evento, ahora) === 'vencido';
}

/** Próximos y en curso, del más cercano al más lejano (la home). */
export function eventosProximos(eventos: readonly Evento[], ahora: Date): Evento[] {
  return eventos.filter((e) => !finalizado(e, ahora)).sort(porFecha);
}

/** Del que terminó más recientemente al más viejo (por último día, después por inicio). */
export function masRecientePrimero(a: Evento, b: Evento): number {
  return b.fechaFin.localeCompare(a.fechaFin) || b.fecha.localeCompare(a.fecha) || a.titulo.localeCompare(b.titulo);
}

/** Terminados, del más reciente al más viejo (Eventos anteriores). */
export function eventosAnteriores(eventos: readonly Evento[], ahora: Date): Evento[] {
  return eventos.filter((e) => finalizado(e, ahora)).sort(masRecientePrimero);
}

/** "18:00", "18:00 a 21:30" o undefined. */
export function horario(evento: Pick<Evento, 'horaInicio' | 'horaFin'>): string | undefined {
  if (!evento.horaInicio) return undefined;
  return evento.horaFin ? `${evento.horaInicio} a ${evento.horaFin}` : evento.horaInicio;
}

/** "Gratuito", "Pago · $5.000", "A confirmar" o undefined. */
export function costoTexto(evento: Pick<Evento, 'costo' | 'costoMonto'>): string | undefined {
  if (!evento.costo) return undefined;
  const etiqueta = ETIQUETAS_COSTO[evento.costo];
  return evento.costo === 'pago' && evento.costoMonto ? `${etiqueta} · ${evento.costoMonto}` : etiqueta;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Partes de una fecha civil. El día de la semana se calcula en UTC: una fecha civil no tiene zona. */
function partes(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  return { anio, mes, dia, semana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() };
}

/**
 * Fecha para leer en la página del evento:
 * "sábado 24 de octubre de 2026" · "del 10 al 12 de marzo de 2027" ·
 * "del 30 de marzo al 2 de abril de 2027" · "del 30 de diciembre de 2026 al 2 de enero de 2027".
 */
export function fechaLarga(fecha: string, fechaFin: string = fecha): string {
  const ini = partes(fecha);
  const fin = partes(fechaFin);
  if (fecha === fechaFin) return `${DIAS[ini.semana]} ${ini.dia} de ${MESES[ini.mes - 1]} de ${ini.anio}`;
  if (ini.anio !== fin.anio) {
    return `del ${ini.dia} de ${MESES[ini.mes - 1]} de ${ini.anio} al ${fin.dia} de ${MESES[fin.mes - 1]} de ${fin.anio}`;
  }
  if (ini.mes === fin.mes) return `del ${ini.dia} al ${fin.dia} de ${MESES[fin.mes - 1]} de ${fin.anio}`;
  return `del ${ini.dia} de ${MESES[ini.mes - 1]} al ${fin.dia} de ${MESES[fin.mes - 1]} de ${fin.anio}`;
}

/** Ruta de la página de un evento. */
export const rutaEvento = (evento: Pick<Evento, 'slug'>) => `/eventos/${evento.slug}/`;

/**
 * Badge de la tarjeta: quién organiza. "Organiza la Comisión" o "Organiza: <nombre>"; sin
 * nombre, no hay badge (un genérico "Evento externo" no dice nada).
 */
export function etiquetaOrganizador(evento: Pick<Evento, 'organizaComision' | 'organizadorNombre'>): string | undefined {
  if (evento.organizaComision) return 'Organiza la Comisión';
  const nombre = evento.organizadorNombre?.trim();
  return nombre ? `Organiza: ${nombre}` : undefined;
}
