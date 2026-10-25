import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Genre } from '../schemas/MoviesTypes';
import { upsertGenres } from './genre-writer';
import { initializeGenresSchema } from './schema';

describe('upsertGenres', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeGenresSchema(database);
  });

  afterEach(() => {
    database.close();
  });

  function getGenres(): { id: number; name: string }[] {
    return database
      .prepare('SELECT id, name FROM genres ORDER BY id')
      .all() as { id: number; name: string }[];
  }

  it('inserts every genre provided in an array', () => {
    const genres: Genre[] = [
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
    ];

    upsertGenres(database, genres);

    expect(getGenres()).toEqual([
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
    ]);
  });

  it('updates the name of an existing genre without creating a duplicate', () => {
    database
      .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
      .run(18, 'Old name');

    upsertGenres(database, [{ id: 18, name: 'Updated name' }]);

    expect(getGenres()).toEqual([{ id: 18, name: 'Updated name' }]);
  });

  it('accepts any iterable of genres', () => {
    function* genreIterable(): Iterable<Genre> {
      yield { id: 12, name: 'Adventure' };
      yield { id: 16, name: 'Animation' };
    }

    upsertGenres(database, genreIterable());

    expect(getGenres()).toEqual([
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
    ]);
  });

  it('does not change the database when given an empty iterable', () => {
    database
      .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
      .run(99, 'Existing');

    upsertGenres(database, []);

    expect(getGenres()).toEqual([{ id: 99, name: 'Existing' }]);
  });

  it('keeps the last value when an ID appears more than once', () => {
    upsertGenres(database, [
      { id: 14, name: 'Action' },
      { id: 14, name: 'Animation' },
    ]);

    expect(getGenres()).toEqual([{ id: 14, name: 'Animation' }]);
  });

  it('rejects a genre without a name', () => {
    expect(() =>
      database.prepare('INSERT INTO genres (id) VALUES (?)').run(21),
    ).toThrow(/NOT NULL constraint failed: genres.name/);
  });
});
