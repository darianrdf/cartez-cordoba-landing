import type { Miembro } from '@/lib/tipos';

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

/** Iniciales del nombre y el primer apellido: "Darián Rodriguez Dieguez" → "DR". */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase('es'))
    .join('');
}
