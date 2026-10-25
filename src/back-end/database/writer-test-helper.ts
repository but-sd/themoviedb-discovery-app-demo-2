import type { DatabaseSync } from 'node:sqlite';
import type {
  Genre,
  Movie,
  MovieCollectionDetails,
} from '../schemas/MoviesTypes';
import { createGenreWriter } from './genre-writer';
import { upsertMovies as writeMovies } from './movie-writer';

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  genres: Iterable<Genre> = [],
  details: ReadonlyMap<number, MovieCollectionDetails> = new Map(),
): void {
  const collectedMovies = [...movies];
  database.exec('BEGIN');
  try {
    const writer = createGenreWriter(database);
    writer.upsertGenres(genres);
    for (const movie of collectedMovies) {
      for (const id of movie.genre_ids) writer.ensureGenre(id);
    }
    writeMovies(database, collectedMovies, details);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
