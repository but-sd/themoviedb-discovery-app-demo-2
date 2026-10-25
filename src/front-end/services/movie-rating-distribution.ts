import { MOVIE_RATING_RANGES } from '../../back-end/schemas/MoviesTypes';
import type { MovieRatingDistribution } from '../../back-end/schemas/MoviesTypes';

export async function fetchMovieRatingDistribution(
  signal?: AbortSignal,
): Promise<MovieRatingDistribution> {
  const response = await fetch('/api/movies/ratings/distribution', { signal });
  if (!response.ok) {
    throw new Error('Impossible de charger les statistiques des notes.');
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('unratedMovieCount' in data) ||
    typeof data.unratedMovieCount !== 'number' ||
    !Number.isSafeInteger(data.unratedMovieCount) ||
    data.unratedMovieCount < 0 ||
    !('buckets' in data) ||
    !Array.isArray(data.buckets) ||
    data.buckets.length !== MOVIE_RATING_RANGES.length ||
    !data.buckets.every(
      (
        row: unknown,
        index,
      ): row is MovieRatingDistribution['buckets'][number] =>
        typeof row === 'object' &&
        row !== null &&
        'label' in row &&
        row.label === MOVIE_RATING_RANGES[index].label &&
        'movieCount' in row &&
        typeof row.movieCount === 'number' &&
        Number.isSafeInteger(row.movieCount) &&
        row.movieCount >= 0,
    ) ||
    !('years' in data) ||
    !Array.isArray(data.years) ||
    !data.years.every(
      (row: unknown): row is MovieRatingDistribution['years'][number] =>
        typeof row === 'object' &&
        row !== null &&
        'year' in row &&
        typeof row.year === 'number' &&
        Number.isSafeInteger(row.year) &&
        'averageRating' in row &&
        typeof row.averageRating === 'number' &&
        Number.isFinite(row.averageRating) &&
        row.averageRating >= 0 &&
        row.averageRating <= 10 &&
        'movieCount' in row &&
        typeof row.movieCount === 'number' &&
        Number.isSafeInteger(row.movieCount) &&
        row.movieCount > 0,
    ) ||
    new Set(data.years.map((row) => row.year)).size !== data.years.length ||
    data.buckets.reduce((total, row) => total + row.movieCount, 0) <
      data.years.reduce((total, row) => total + row.movieCount, 0)
  ) {
    throw new Error('Les statistiques des notes sont invalides.');
  }
  return {
    buckets: data.buckets,
    years: data.years.sort((left, right) => left.year - right.year),
    unratedMovieCount: data.unratedMovieCount,
  };
}
