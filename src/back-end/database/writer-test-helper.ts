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
    const namedGenres = new Map<number, Genre>();
    for (const movie of collectedMovies) {
      for (const id of movie.genre_ids) {
        namedGenres.set(id, { id, name: `Test genre ${id}` });
      }
    }
    for (const genre of genres) namedGenres.set(genre.id, genre);
    writer.upsertGenres(namedGenres.values());
    writeMovies(database, collectedMovies, details);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
