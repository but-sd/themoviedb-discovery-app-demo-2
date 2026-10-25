import type { DatabaseSync } from 'node:sqlite';
import type { Genre } from '../schemas/MoviesTypes';

/**
 * Creates a genre writer for performing genre-related database operations.
 * @param database The SQLite database to use for genre operations.
 * @returns An object with methods to upsert and ensure genres in the database.
 */
export function createGenreWriter(database: DatabaseSync) {
  const upsertGenre = database.prepare(`
    INSERT INTO genres (id, name) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `);
  const ensureGenre = database.prepare(
    'INSERT OR IGNORE INTO genres (id) VALUES (?)',
  );

  return {
    upsertGenres(genres: Iterable<Genre>): void {
      for (const genre of genres) {
        upsertGenre.run(genre.id, genre.name);
      }
    },
    ensureGenre(genreId: number): void {
      ensureGenre.run(genreId);
    },
  };
}
