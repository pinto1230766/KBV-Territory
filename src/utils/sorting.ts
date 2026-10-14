import type { LocationItem } from '../types';

export type StreetSortOrder = 'numeric' | 'even_odd' | 'odd_even';

export function extractHouseNumber(numStr: string): number {
  if (!numStr) return Number.MAX_SAFE_INTEGER;
  // Extrait uniquement les chiffres du début du numéro (ex: "12 bis" -> 12, "4B" -> 4)
  const matches = numStr.match(/\d+/);
  return matches ? parseInt(matches[0], 10) : Number.MAX_SAFE_INTEGER;
}

export function sortLocationsByOrder(locations: LocationItem[], order: StreetSortOrder): LocationItem[] {
  return [...locations].sort((a, b) => {
    const numA = extractHouseNumber(a.number);
    const numB = extractHouseNumber(b.number);

    if (order === 'numeric') {
      return numA - numB;
    }

    if (order === 'even_odd') {
      // Pairs d'abord (clé = num), Impairs ensuite (clé = num + 100000)
      const keyA = numA % 2 === 0 ? numA : numA + 100000;
      const keyB = numB % 2 === 0 ? numB : numB + 100000;
      return keyA - keyB;
    }

    if (order === 'odd_even') {
      // Impairs d'abord (clé = num), Pairs ensuite (clé = num + 100000)
      const keyA = numA % 2 !== 0 ? numA : numA + 100000;
      const keyB = numB % 2 !== 0 ? numB : numB + 100000;
      return keyA - keyB;
    }

    return 0;
  });
}
