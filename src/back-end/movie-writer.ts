import type { DatabaseSync } from 'node:sqlite';
import { upsertMovie } from './database/movie-repository.ts';
import {
  discoverMovies,
  getMovieDetails,
  validateDiscoverYear,
} from './tmdb-service.ts';
import type { DiscoverOptions } from './tmdb-service.ts';

export async function importMovies(
  database: DatabaseSync,
  options: Omit<DiscoverOptions, 'page'>,
): Promise<number> {
  validateDiscoverYear(options.year);
  const importedIds = new Set<number>();
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
      if (importedIds.has(movie.id)) {
        continue;
      }
      try {
        const details = await getMovieDetails(String(movie.id), options);
        if (details.id !== movie.id) {
          throw new Error(
            'Movie detail ID does not match the discovered movie',
          );
        }
        upsertMovie(database, details);
        importedIds.add(movie.id);
      } catch (error) {
        throw new Error(`Failed to import movie ${movie.id} on page ${page}`, {
          cause: error,
        });
      }
    }
  }
  return importedIds.size;
}
