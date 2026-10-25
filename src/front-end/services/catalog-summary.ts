import type { CatalogSummary } from '../../back-end/schemas/MoviesTypes';

export async function fetchCatalogSummary(
  signal?: AbortSignal,
): Promise<CatalogSummary> {
  const response = await fetch('/api/movies/catalog-summary', { signal });
  if (!response.ok)
    throw new Error('Impossible de charger les informations du catalogue.');
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('movieCount' in data) ||
    typeof data.movieCount !== 'number' ||
    !Number.isSafeInteger(data.movieCount) ||
    data.movieCount < 0 ||
    !('years' in data) ||
    !Array.isArray(data.years) ||
    !data.years.every(
      (year: unknown): year is number =>
        typeof year === 'number' &&
        Number.isSafeInteger(year) &&
        year >= 1 &&
        year <= 9999,
    ) ||
    new Set(data.years).size !== data.years.length ||
    data.years.length > data.movieCount
  ) {
    throw new Error('Les informations du catalogue sont invalides.');
  }
  return {
    movieCount: data.movieCount,
    years: data.years.toSorted((a, b) => a - b),
  };
}
