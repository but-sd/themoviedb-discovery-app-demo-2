import { MOVIE_RUNTIME_RANGES } from '../../back-end/schemas/MoviesTypes';
import type { MovieRuntimeDistribution } from '../../back-end/schemas/MoviesTypes';

export async function fetchMovieRuntimeDistribution(
  signal?: AbortSignal,
): Promise<MovieRuntimeDistribution> {
  const response = await fetch('/api/movies/runtimes/distribution', { signal });
  if (!response.ok) {
    throw new Error('Impossible de charger la répartition par durée.');
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('unknownMovieCount' in data) ||
    typeof data.unknownMovieCount !== 'number' ||
    !Number.isSafeInteger(data.unknownMovieCount) ||
    data.unknownMovieCount < 0 ||
    !('buckets' in data) ||
    !Array.isArray(data.buckets) ||
    data.buckets.length !== MOVIE_RUNTIME_RANGES.length ||
    !data.buckets.every(
      (
        bucket: unknown,
        index,
      ): bucket is MovieRuntimeDistribution['buckets'][number] =>
        typeof bucket === 'object' &&
        bucket !== null &&
        'label' in bucket &&
        bucket.label === MOVIE_RUNTIME_RANGES[index].label &&
        'movieCount' in bucket &&
        typeof bucket.movieCount === 'number' &&
        Number.isSafeInteger(bucket.movieCount) &&
        bucket.movieCount >= 0,
    )
  ) {
    throw new Error('La répartition par durée est invalide.');
  }
  return { buckets: data.buckets, unknownMovieCount: data.unknownMovieCount };
}
