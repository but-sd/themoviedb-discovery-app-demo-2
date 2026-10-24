import type { MovieYearDistribution } from '../../back-end/schemas/MoviesTypes';

export async function fetchMovieYearDistribution(
  signal?: AbortSignal,
): Promise<MovieYearDistribution[]> {
  const response = await fetch('/api/movies/years/distribution', { signal });
  if (!response.ok) {
    throw new Error(
      'Impossible de charger la répartition par année de sortie.',
    );
  }
  const data: unknown = await response.json();
  if (
    !Array.isArray(data) ||
    !data.every(
      (row: unknown): row is MovieYearDistribution =>
        typeof row === 'object' &&
        row !== null &&
        'year' in row &&
        typeof row.year === 'number' &&
        Number.isSafeInteger(row.year) &&
        'movieCount' in row &&
        typeof row.movieCount === 'number' &&
        Number.isSafeInteger(row.movieCount) &&
        row.movieCount > 0,
    )
  ) {
    throw new Error('La répartition par année de sortie est invalide.');
  }
  if (new Set(data.map((row) => row.year)).size !== data.length) {
    throw new Error('La répartition par année de sortie est invalide.');
  }
  return data.sort((left, right) => left.year - right.year);
}
