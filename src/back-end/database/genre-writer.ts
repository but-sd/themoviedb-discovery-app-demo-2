import type { DatabaseSync } from 'node:sqlite';
import type { Genre } from '../schemas/MoviesTypes';

/**
 * Upserts the provided genres into the database.
 * If a genre with the same ID already exists, its name will be updated.
 * @param database The SQLite database to use for the operation.
 * @param genres An iterable of genres to upsert into the database.
 */
export function upsertGenres(
  database: DatabaseSync,
  genres: Iterable<Genre>,
): void {
  const upsertGenre = database.prepare(`
    INSERT INTO genres (id, name) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `);

  for (const genre of genres) {
    upsertGenre.run(genre.id, genre.name);
  }
}
