import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import { tmdbAccessToken } from './config';
import type {
  MoviesApiResponse,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';
import { toSupportedMovie } from './utils';

export function isValidMovieYear(year: unknown): year is string {
  return (
    typeof year === 'string' &&
    /^\d{4}$/.test(year) &&
    Number(year) >= 1870 &&
    Number(year) <= new Date().getFullYear()
  );
}

export async function discoverMovies(
  year: string,
  page = DEFAULT_PAGE,
  language = DEFAULT_LANGUAGE,
  region = DEFAULT_REGION,
): Promise<MoviesApiResponse> {
  if (!isValidMovieYear(year)) {
    throw new Error('Year must be a valid past year.');
  }

  const query = new URLSearchParams({
    language,
    page,
    region,
    primary_release_year: year,
    sort_by: 'popularity.desc',
  });
  const response = await fetch(
    `https://api.themoviedb.org/3/discover/movie?${query}`,
    {
      headers: {
        Authorization: `Bearer ${tmdbAccessToken}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`TMDB API request failed with status ${response.status}`);
  }
  const data = (await response.json()) as TmdbMoviesRawResponse;
  return { ...data, results: data.results.map(toSupportedMovie) };
}
