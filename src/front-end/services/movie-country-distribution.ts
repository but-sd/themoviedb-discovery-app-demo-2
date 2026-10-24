import type {
  MovieCountryDistribution,
  ProductionCountryHighlight,
} from '../../back-end/schemas/MoviesTypes';

export async function fetchMovieCountryDistribution(
  signal?: AbortSignal,
): Promise<MovieCountryDistribution> {
  const response = await fetch('/api/movies/countries/distribution', {
    signal,
  });
  if (!response.ok) {
    throw new Error(
      'Impossible de charger la répartition par pays de production.',
    );
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('unknownMovieCount' in data) ||
    typeof data.unknownMovieCount !== 'number' ||
    !Number.isSafeInteger(data.unknownMovieCount) ||
    data.unknownMovieCount < 0 ||
    !('countries' in data) ||
    !Array.isArray(data.countries) ||
    !data.countries.every(
      (row: unknown): row is ProductionCountryHighlight =>
        typeof row === 'object' &&
        row !== null &&
        'code' in row &&
        typeof row.code === 'string' &&
        /^[A-Z]{2}$/.test(row.code) &&
        'name' in row &&
        typeof row.name === 'string' &&
        row.name.trim().length > 0 &&
        'movieCount' in row &&
        typeof row.movieCount === 'number' &&
        Number.isSafeInteger(row.movieCount) &&
        row.movieCount > 0,
    ) ||
    new Set(data.countries.map((row) => row.code)).size !==
      data.countries.length
  ) {
    throw new Error('La répartition par pays de production est invalide.');
  }
  return {
    countries: data.countries.toSorted(
      (left, right) =>
        right.movieCount - left.movieCount ||
        left.code.localeCompare(right.code, 'en'),
    ),
    unknownMovieCount: data.unknownMovieCount,
  };
}
