import { discoverMovies, isValidMovieYear } from './discover-movies';
import {
  createMoviesDatabase,
  DEFAULT_DATABASE_PATH,
  upsertMovies,
} from './movies-database';
import type { Movie } from './schemas/MoviesTypes';

export async function collectMovies(
  year: number,
  databasePath = DEFAULT_DATABASE_PATH,
): Promise<{ year: number; collected: number; databasePath: string }> {
  if (!Number.isInteger(year) || !isValidMovieYear(String(year))) {
    throw new Error('Year must be a valid past year.');
  }

  const movies = new Map<number, Movie>();
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const result = await discoverMovies(String(year), String(page));
    if (
      result.page !== page ||
      !Number.isInteger(result.total_pages) ||
      result.total_pages < 0
    ) {
      throw new Error('TMDB returned invalid pagination.');
    }
    if (result.total_pages > 500) {
      throw new Error(
        'TMDB limits discovery to 500 pages. This year requires a narrower search; no movies were saved.',
      );
    }
    totalPages = Math.max(totalPages, result.total_pages);
    for (const movie of result.results) {
      movies.set(movie.id, movie);
    }
  }

  const database = createMoviesDatabase(databasePath);
  try {
    upsertMovies(database, movies.values(), year);
  } finally {
    database.close();
  }
  return { year, collected: movies.size, databasePath };
}
