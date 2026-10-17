export const secciones = [
  { id: 'conocenos', etiqueta: 'Conocenos' },
  { id: 'eventos', etiqueta: 'Eventos' },
  { id: 'comision', etiqueta: 'Comisión' },
  { id: 'contacto', etiqueta: 'Sumate' },
] as const;

export type Seccion = (typeof secciones)[number];
