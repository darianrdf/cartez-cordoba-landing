import { urlStorage, type FilaEvento } from './contenido';
import { estadoEvento } from './fechas';
import type { Categoria, Evento, Imagen } from './tipos';

export const ETIQUETAS_CATEGORIA: Record<Categoria, string> = {
  rural: 'Rural',
  congreso: 'Congreso',
  charla: 'Charla',
  visita: 'Visita',
  peña: 'Peña',
  actividad: 'Actividad',
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

/**
 * Eventos de contenido_landing() → tipo de dominio. Deja los no vencidos (próximos y en curso) en
 * el instante `ahora`, ordenados por fecha de inicio. La base ya filtra los vencidos; acá se
 * vuelve a filtrar por si se usa un snapshot viejo.
 */
export function eventosDeContenido(origen: string, filas: readonly FilaEvento[], ahora: Date): Evento[] {
  return filas
    .map(
      (f): Evento => ({
        id: f.id,
        titulo: f.titulo,
        fecha: f.fecha,
        fechaFin: f.fecha_fin,
        lugar: f.lugar,
        categoria: f.categoria,
        organizador: f.organizador,
        link: f.link ?? undefined,
        flyer: f.flyer_path ? urlStorage(origen, 'landing', f.flyer_path) : undefined,
        descripcion: f.descripcion?.trim() || undefined,
      }),
    )
    .filter((evento) => estadoEvento(evento, ahora) !== 'vencido')
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.fechaFin.localeCompare(b.fechaFin));
}
