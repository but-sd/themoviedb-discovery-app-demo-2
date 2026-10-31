import type { DatabaseSync } from 'node:sqlite';
import { importMovies } from './movie-writer.ts';

export type TmdbMovieImportFailure = {
  movieId: number;
  page: number;
  error: Error;
};

export type TmdbMovieImportResult = {
  imported: number;
  failures: TmdbMovieImportFailure[];
};

export async function importTmdbMovies(
  database: DatabaseSync,
  year: number | string,
  options: { language?: string; region?: string } = {},
): Promise<TmdbMovieImportResult> {
  const failures: TmdbMovieImportFailure[] = [];
  const imported = await importMovies(
    database,
    { ...options, year: String(year) },
    (failure) => {
      failures.push(failure);
      console.error(
        `TMDB movie import failed for ID ${failure.movieId} on page ${failure.page}:`,
        failure.error,
      );
    },
  );
  return { imported, failures };
}
