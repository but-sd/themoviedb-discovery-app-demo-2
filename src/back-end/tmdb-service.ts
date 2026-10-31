import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants.ts';
import type {
  MovieDetails,
  MoviesApiResponse,
  TmdbMovieDetails,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes.ts';
import { toSupportedMovie, toSupportedMovieDetails } from './utils.ts';

export type DiscoverOptions = {
  year: string;
  language?: string;
  page?: string;
  region?: string;
};

export function validateDiscoverYear(year: string): void {
  if (!/^[1-9]\d{3}$/.test(year)) {
    throw new Error('year must be a four-digit year between 1000 and 9999');
  }
}

async function fetchTmdb(
  path: string,
  query: URLSearchParams,
): Promise<unknown> {
  const { tmdbAccessToken } = await import('./config.ts');
  const response = await fetch(
    `https://api.themoviedb.org/3/${path}?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tmdbAccessToken}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`TMDB API request failed with status ${response.status}`);
  }
  return response.json();
}

export async function discoverMovies({
  year,
  language = DEFAULT_LANGUAGE,
  page = DEFAULT_PAGE,
  region = DEFAULT_REGION,
}: DiscoverOptions): Promise<MoviesApiResponse> {
  validateDiscoverYear(year);
  const rawData = (await fetchTmdb(
    'discover/movie',
    new URLSearchParams({
      primary_release_year: year,
      language,
      page,
      region,
    }),
  )) as TmdbMoviesRawResponse;
  return {
    page: rawData.page,
    results: rawData.results.map(toSupportedMovie),
    total_pages: rawData.total_pages,
    total_results: rawData.total_results,
  };
}

export async function getMovieDetails(
  id: string,
  {
    language = DEFAULT_LANGUAGE,
    page = DEFAULT_PAGE,
    region = DEFAULT_REGION,
  }: { language?: string; page?: string; region?: string } = {},
): Promise<MovieDetails> {
  const rawData = (await fetchTmdb(
    `movie/${encodeURIComponent(id)}`,
    new URLSearchParams({ language, page, region }),
  )) as TmdbMovieDetails;
  return toSupportedMovieDetails(rawData);
}
