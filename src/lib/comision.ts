import comision from '@/data/comision.json';

export interface Miembro {
  cargo: string;
  nombre: string;
  foto: string;
  orden: number;
  destacado: boolean;
}

export interface Comision {
  etapa: string;
  miembros: Miembro[];
}

export const datosComision: Comision = comision;

/**
 * Agrupa los miembros destacados en filas según `orden` (mismo orden = misma fila),
 * de menor a mayor. No asume ningún cargo en particular.
 */
export function filasDestacadas(miembros: Miembro[]): Miembro[][] {
  const filas = new Map<number, Miembro[]>();
  for (const miembro of miembros) {
    if (!miembro.destacado) continue;
    const fila = filas.get(miembro.orden) ?? [];
    fila.push(miembro);
    filas.set(miembro.orden, fila);
  }
  return [...filas.entries()].sort(([a], [b]) => a - b).map(([, fila]) => fila);
}
