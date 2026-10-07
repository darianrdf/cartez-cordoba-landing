/**
 * Lógica de fechas de eventos. Módulo puro: sin dependencias de Astro ni de la fuente de datos,
 * se usa en el build y en el navegador.
 *
 * Reglas:
 * - Las fechas de eventos son fechas civiles 'YYYY-MM-DD' (sin hora ni zona).
 * - Toda comparación se hace en America/Argentina/Cordoba, nunca en UTC ni en la hora del servidor.
 * - Un evento vence a las HORA_VENCIMIENTO del día `fechaFin`, hora de Córdoba.
 */

export const ZONA_HORARIA = 'America/Argentina/Cordoba';

/** Hora (de Córdoba) del día `fechaFin` a la que el evento deja de mostrarse. */
export const HORA_VENCIMIENTO = 23;

/** Fecha civil 'YYYY-MM-DD'. */
export type FechaCivil = string;

export type EstadoEvento = 'proximo' | 'en-curso' | 'vencido';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function partes(fecha: FechaCivil) {
  const m = RE_FECHA.exec(fecha);
  if (!m) throw new Error(`Fecha inválida: "${fecha}" (se espera YYYY-MM-DD)`);
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/**
 * Convierte una fecha de la fuente de datos en fecha civil.
 * - Date: el parser YAML convierte `2026-10-23` en 2026-10-23T00:00:00Z, así que se toman
 *   las partes en UTC (tomarlas en hora local correría el día en zonas al oeste de Greenwich).
 * - string: se espera 'YYYY-MM-DD' (formato de las columnas `date` de Postgres/Supabase).
 */
export function normalizarFecha(valor: Date | string): FechaCivil {
  if (typeof valor === 'string') {
    partes(valor);
    return valor;
  }
  if (Number.isNaN(valor.getTime())) throw new Error('Fecha inválida');
  const anio = String(valor.getUTCFullYear()).padStart(4, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

const formateadores = new Map<string, Intl.DateTimeFormat>();

/** Diferencia en minutos entre la hora de `zona` y UTC en ese instante (Córdoba: -180). */
function offsetMinutos(instante: Date, zona: string): number {
  let dtf = formateadores.get(zona);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formateadores.set(zona, dtf);
  }
  const p = Object.fromEntries(dtf.formatToParts(instante).map(({ type, value }) => [type, Number(value)]));
  const comoUTC = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  const sinMs = instante.getTime() - instante.getUTCMilliseconds();
  return Math.round((comoUTC - sinMs) / 60_000);
}

/** Instante en que el reloj de `zona` marca `fecha` a la `hora`:`minuto`. */
export function instanteEnZona(fecha: FechaCivil, hora = 0, minuto = 0, zona = ZONA_HORARIA): Date {
  const { anio, mes, dia } = partes(fecha);
  const relojComoUTC = Date.UTC(anio, mes - 1, dia, hora, minuto);
  // Dos pasadas para resolver correctamente zonas con cambio de horario.
  let ts = relojComoUTC - offsetMinutos(new Date(relojComoUTC), zona) * 60_000;
  ts = relojComoUTC - offsetMinutos(new Date(ts), zona) * 60_000;
  return new Date(ts);
}

/** ISO 8601 con el offset de la zona: '2026-10-23T23:00:00-03:00'. */
export function isoConOffset(instante: Date, zona = ZONA_HORARIA): string {
  const offset = offsetMinutos(instante, zona);
  const reloj = new Date(instante.getTime() + offset * 60_000).toISOString().slice(0, 19);
  const signo = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${reloj}${signo}${hh}:${mm}`;
}

/** 00:00 (Córdoba) del día de inicio. */
export function inicioEvento(fecha: FechaCivil): Date {
  return instanteEnZona(fecha, 0);
}

/** HORA_VENCIMIENTO (Córdoba) del día de fin. */
export function vencimientoEvento(fechaFin: FechaCivil): Date {
  return instanteEnZona(fechaFin, HORA_VENCIMIENTO);
}

/** Estado a partir de instantes ya calculados (lo usa también el script del navegador). */
export function estadoPorInstantes(inicioMs: number, venceMs: number, ahoraMs: number): EstadoEvento {
  if (ahoraMs >= venceMs) return 'vencido';
  if (ahoraMs >= inicioMs) return 'en-curso';
  return 'proximo';
}

export function estadoEvento(
  { fecha, fechaFin = fecha }: { fecha: FechaCivil; fechaFin?: FechaCivil },
  ahora: Date = new Date(),
): EstadoEvento {
  return estadoPorInstantes(inicioEvento(fecha).getTime(), vencimientoEvento(fechaFin).getTime(), ahora.getTime());
}

/** "23 oct" · "10–12 ene" · "30 ene – 2 feb". */
export function formatearRango(fecha: FechaCivil, fechaFin: FechaCivil = fecha): string {
  const ini = partes(fecha);
  const fin = partes(fechaFin);
  const mesIni = MESES[ini.mes - 1];
  const mesFin = MESES[fin.mes - 1];

  if (fecha === fechaFin) return `${ini.dia} ${mesIni}`;
  if (ini.anio === fin.anio && ini.mes === fin.mes) return `${ini.dia}–${fin.dia} ${mesFin}`;
  return `${ini.dia} ${mesIni} – ${fin.dia} ${mesFin}`;
}
