import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createMoviesDatabase } from './connection';

it('creates the database schema and can reopen an initialized database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
  const databasePath = join(directory, 'nested', 'movies.sqlite');
  try {
    const database = createMoviesDatabase(databasePath);
    try {
      expect(database.prepare('PRAGMA foreign_keys').get()).toEqual({
        foreign_keys: 1,
      });
      expect(() =>
        database.prepare('INSERT INTO movie_genres VALUES (?, ?)').run(1, 18),
      ).toThrow(/FOREIGN KEY constraint failed/);
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toMatchObject({ count: 0 });
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
          .all(),
      ).toContainEqual(
        expect.objectContaining({ name: 'movies_release_year' }),
      );
    } finally {
      database.close();
    }

    const reopenedDatabase = createMoviesDatabase(databasePath);
    reopenedDatabase.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
