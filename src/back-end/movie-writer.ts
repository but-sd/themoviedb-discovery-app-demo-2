import type { DatabaseSync } from 'node:sqlite';
import { saveMovieDetails } from './movie-persistence-service.ts';
import {
  discoverMovies,
  getMovieDetails,
  validateDiscoverYear,
} from './tmdb-service.ts';
import type { DiscoverOptions } from './tmdb-service.ts';

export async function importMovies(
  database: DatabaseSync,
  options: Omit<DiscoverOptions, 'page'>,
  onMovieError?: (failure: {
    movieId: number;
    page: number;
    error: Error;
  }) => void,
): Promise<number> {
  validateDiscoverYear(options.year);
  const importedIds = new Set<number>();
  const attemptedIds = new Set<number>();
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const discovered = await discoverMovies({ ...options, page: String(page) });
    if (
      discovered.page !== page ||
      !Number.isSafeInteger(discovered.total_pages) ||
      discovered.total_pages < 0 ||
      discovered.total_pages > 500
    ) {
      throw new Error(
        'Discover returned invalid pagination or exceeded the TMDB limit of 500 pages',
      );
    }
    totalPages = discovered.total_pages;
    for (const movie of discovered.results) {
      if (attemptedIds.has(movie.id)) {
        continue;
      }
      attemptedIds.add(movie.id);
      try {
        const details = await getMovieDetails(String(movie.id), options);
        if (details.id !== movie.id) {
          throw new Error(
            'Movie detail ID does not match the discovered movie',
          );
        }
        saveMovieDetails(database, details);
        importedIds.add(movie.id);
      } catch (error) {
        const failure = new Error(
          `Failed to import movie ${movie.id} on page ${page}`,
          {
            cause: error,
          },
        );
        if (!onMovieError) {
          throw failure;
        }
        onMovieError({ movieId: movie.id, page, error: failure });
      }
    }
  }
  return importedIds.size;
}
