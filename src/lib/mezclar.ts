/**
 * Copia de `lista` en orden al azar (Fisher-Yates). Módulo puro: lo usa Contacto.astro en el
 * navegador para repartir los mensajes entre los contactos de WhatsApp (dashboard D-27).
 * `aleatorio` devuelve un número en [0, 1), como Math.random (los tests lo fijan).
 */
export function mezclar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}
