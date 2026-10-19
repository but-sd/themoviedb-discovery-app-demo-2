import type {
  CollectionSummary,
  MovieHighlight,
} from '../../back-end/schemas/MoviesTypes';

function isMovieHighlight(value: unknown): value is MovieHighlight | null {
  return (
    value === null ||
    (typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'number' &&
      Number.isSafeInteger(value.id) &&
      'title' in value &&
      typeof value.title === 'string' &&
      'year' in value &&
      typeof value.year === 'number' &&
      Number.isInteger(value.year) &&
      'rating' in value &&
      typeof value.rating === 'number' &&
      Number.isFinite(value.rating) &&
      value.rating >= 0 &&
      value.rating <= 10 &&
      'voteCount' in value &&
      typeof value.voteCount === 'number' &&
      Number.isSafeInteger(value.voteCount) &&
      value.voteCount >= 0 &&
      'popularity' in value &&
      typeof value.popularity === 'number' &&
      Number.isFinite(value.popularity) &&
      value.popularity >= 0)
  );
}

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
  if (
    !('bestRatedMovie' in data) ||
    !isMovieHighlight(data.bestRatedMovie) ||
    !('mostPopularMovie' in data) ||
    !isMovieHighlight(data.mostPopularMovie)
  ) {
    throw new Error('Les informations des films à la une sont invalides.');
  }
  return {
    movieCount: data.movieCount,
    years: data.years,
    averageRuntime: data.averageRuntime,
    runtimeMovieCount: data.runtimeMovieCount,
    averageRating: data.averageRating,
    ratedMovieCount: data.ratedMovieCount,
    bestRatedMovie: data.bestRatedMovie,
    mostPopularMovie: data.mostPopularMovie,
  };
}
