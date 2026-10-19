import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createMoviesDatabase, upsertMovies } from './movies-database';
import type { Movie } from './schemas/MoviesTypes';

const movie: Movie = {
  id: 1,
  title: 'Original title',
  original_title: 'Original title',
  original_language: 'en',
  overview: '',
  release_date: '2020-01-01',
  popularity: 10,
  vote_average: 7,
  vote_count: 20,
  poster_path: null,
  backdrop_path: null,
  genre_ids: [18],
};

it('inserts and updates movies without duplicates', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [movie], 2020);
    upsertMovies(database, [{ ...movie, title: 'Updated title' }], 2020);
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
    ).toMatchObject({ count: 1 });
    expect(
      database.prepare('SELECT * FROM movies WHERE id = 1').get(),
    ).toMatchObject({
      title: 'Updated title',
      release_year: 2020,
      genre_ids: '[18]',
    });
  } finally {
    database.close();
  }
});

it('rolls back all changes when a write fails and keeps the connection usable', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [movie], 2020);
    database.exec(`
      CREATE TRIGGER reject_movie BEFORE INSERT ON movies
      WHEN NEW.id = 2
      BEGIN SELECT RAISE(ABORT, 'Rejected movie'); END;
    `);
    expect(() =>
      upsertMovies(
        database,
        [
          { ...movie, title: 'Not saved' },
          { ...movie, id: 2 },
        ],
        2020,
      ),
    ).toThrow('Rejected movie');
    expect(
      database.prepare('SELECT title FROM movies WHERE id = 1').get(),
    ).toMatchObject({ title: movie.title });
    upsertMovies(database, [{ ...movie, title: 'Saved after rollback' }], 2020);
    expect(
      database.prepare('SELECT title FROM movies WHERE id = 1').get(),
    ).toMatchObject({ title: 'Saved after rollback' });
  } finally {
    database.close();
  }
});

it('creates the database schema and can reopen an initialized database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
  const databasePath = join(directory, 'nested', 'movies.sqlite');
  try {
    const database = createMoviesDatabase(databasePath);
    try {
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
