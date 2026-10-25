import {
  discoverMovies,
  fetchMovieGenres,
  fetchMovieCollectionDetails,
  isValidMovieYear,
} from './discover-movies';
import {
  createMoviesDatabase,
  DEFAULT_DATABASE_PATH,
} from './database/connection';
import { upsertMovies } from './database/movie-writer';
import type { Movie, MovieCollectionDetails } from './schemas/MoviesTypes';

/**
 * Collecte les films pour une année donnée et les enregistre dans la base de données.
 * @param year L'année de sortie des films à collecter
 * @param limit Le nombre maximum de films à collecter pour l'année donnée
 * @param databasePath Le chemin vers la base de données SQLite
 * @returns Un objet contenant l'année, le nombre de films collectés et le chemin de la base de données
 */
export async function collectMovies(
  year: number,
  limit = 100,
  databasePath = DEFAULT_DATABASE_PATH,
): Promise<{ year: number; collected: number; databasePath: string }> {
  // Validate input parameters before proceeding with movie collection.
  if (!Number.isInteger(year) || !isValidMovieYear(String(year))) {
    throw new Error('Year must be a valid past year.');
  }
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error('Movie limit must be a positive integer.');
  }

  const movies = new Map<number, Movie>();
  let totalPages = 1;
  for (let page = 1; page <= totalPages && movies.size < limit; page++) {
    if (page > 500) {
      throw new Error(
        'TMDB limits discovery to 500 pages. The requested count cannot be reached; no movies were saved.',
      );
    }
    const result = await discoverMovies(String(year), String(page));
    if (
      result.page !== page ||
      !Number.isInteger(result.total_pages) ||
      result.total_pages < 0
    ) {
      throw new Error('TMDB returned invalid pagination.');
    }
    totalPages = Math.max(totalPages, result.total_pages);
    for (const movie of result.results) {
      movies.set(movie.id, movie);
      if (movies.size === limit) {
        break;
      }
    }
  }

  const genres = await fetchMovieGenres();
  const details = new Map<number, MovieCollectionDetails>();
  for (const movie of movies.values()) {
    details.set(movie.id, await fetchMovieCollectionDetails(movie.id));
  }
  const database = createMoviesDatabase(databasePath);
  try {
    upsertMovies(database, movies.values(), genres, details);
  } finally {
    database.close();
  }
  return { year, collected: movies.size, databasePath };
}
