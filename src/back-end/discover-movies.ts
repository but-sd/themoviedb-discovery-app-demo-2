import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import { tmdbAccessToken } from './config';
import type {
  MoviesApiResponse,
  MovieCollectionDetails,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';
import { toSupportedMovie } from './utils';
import type { Genre } from './movies-database';

export async function fetchMovieGenres(): Promise<Genre[]> {
  const query = new URLSearchParams({ language: DEFAULT_LANGUAGE });
  const response = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?${query}`,
    {
      headers: {
        Authorization: `Bearer ${tmdbAccessToken}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`TMDB genre request failed with status ${response.status}`);
  }
  const data = (await response.json()) as { genres: Genre[] };
  return data.genres;
}

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
export async function fetchMovieCollectionDetails(
  movieId: number,
): Promise<MovieCollectionDetails> {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}`,
    {
      headers: { Authorization: `Bearer ${tmdbAccessToken}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `TMDB runtime request failed for movie ${movieId} with status ${response.status}`,
    );
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('runtime' in data) ||
    (data.runtime !== null &&
      (typeof data.runtime !== 'number' ||
        !Number.isSafeInteger(data.runtime) ||
        data.runtime < 0))
  ) {
    throw new Error(`TMDB returned an invalid runtime for movie ${movieId}.`);
  }
  if (!('budget' in data) || !('revenue' in data)) {
    throw new Error(
      `TMDB returned missing financial data for movie ${movieId}.`,
    );
  }
  const { budget, revenue } = data;
  function isAmount(amount: unknown): amount is number | null {
    return (
      amount === null ||
      (typeof amount === 'number' &&
        Number.isSafeInteger(amount) &&
        amount >= 0)
    );
  }
  if (!isAmount(budget) || !isAmount(revenue)) {
    throw new Error(
      `TMDB returned invalid financial data for movie ${movieId}.`,
    );
  }
  return {
    runtime: data.runtime === 0 ? null : data.runtime,
    budget: budget === 0 ? null : budget,
    revenue: revenue === 0 ? null : revenue,
  };
}
