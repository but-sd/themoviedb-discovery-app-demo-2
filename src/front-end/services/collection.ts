import type { CollectionSummary } from '../../back-end/schemas/MoviesTypes';

export async function fetchCollectionSummary(
  signal?: AbortSignal,
): Promise<CollectionSummary> {
  const response = await fetch('/api/movies/collection', { signal });
  if (!response.ok) {
    throw new Error('Impossible de lire les informations de la base.');
  }
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
      (year: unknown) => typeof year === 'number' && Number.isInteger(year),
    )
  ) {
    throw new Error('Les informations de la base sont invalides.');
  }
  if (
    !('averageRuntime' in data) ||
    (data.averageRuntime !== null &&
      (typeof data.averageRuntime !== 'number' ||
        !Number.isFinite(data.averageRuntime) ||
        data.averageRuntime <= 0)) ||
    !('runtimeMovieCount' in data) ||
    typeof data.runtimeMovieCount !== 'number' ||
    !Number.isSafeInteger(data.runtimeMovieCount) ||
    data.runtimeMovieCount < 0
  ) {
    throw new Error('Les informations de durée sont invalides.');
  }
  if (
    !('averageRating' in data) ||
    (data.averageRating !== null &&
      (typeof data.averageRating !== 'number' ||
        !Number.isFinite(data.averageRating) ||
        data.averageRating < 0 ||
        data.averageRating > 10)) ||
    !('ratedMovieCount' in data) ||
    typeof data.ratedMovieCount !== 'number' ||
    !Number.isSafeInteger(data.ratedMovieCount) ||
    data.ratedMovieCount < 0
  ) {
    throw new Error('Les informations de notation sont invalides.');
  }
  return {
    movieCount: data.movieCount,
    years: data.years,
    averageRuntime: data.averageRuntime,
    runtimeMovieCount: data.runtimeMovieCount,
    averageRating: data.averageRating,
    ratedMovieCount: data.ratedMovieCount,
  };
}
