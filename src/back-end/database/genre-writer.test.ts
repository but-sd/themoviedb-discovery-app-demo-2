import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Genre } from '../schemas/MoviesTypes';
import { createGenreWriter } from './genre-writer';

describe('createGenreWriter.upsertGenres', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    database.exec(`
      CREATE TABLE genres (
        id INTEGER PRIMARY KEY,
        name TEXT
      )
    `);
  });

  afterEach(() => {
    database.close();
  });

  function getGenres(): { id: number; name: string | null }[] {
    return database
      .prepare('SELECT id, name FROM genres ORDER BY id')
      .all() as { id: number; name: string | null }[];
  }

  it('inserts every genre provided in an array', () => {
    const writer = createGenreWriter(database);
    const genres: Genre[] = [
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
    ];

    writer.upsertGenres(genres);

    expect(getGenres()).toEqual([
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
    ]);
  });

  it('updates the name of an existing genre without creating a duplicate', () => {
    database
      .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
      .run(18, 'Old name');
    const writer = createGenreWriter(database);

    writer.upsertGenres([{ id: 18, name: 'Updated name' }]);

    expect(getGenres()).toEqual([{ id: 18, name: 'Updated name' }]);
  });

  it('accepts any iterable of genres', () => {
    const writer = createGenreWriter(database);
    function* genreIterable(): Iterable<Genre> {
      yield { id: 12, name: 'Adventure' };
      yield { id: 16, name: 'Animation' };
    }

    writer.upsertGenres(genreIterable());

    expect(getGenres()).toEqual([
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
    ]);
  });

  it('does not change the database when given an empty iterable', () => {
    database
      .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
      .run(99, 'Existing');
    const writer = createGenreWriter(database);

    writer.upsertGenres([]);

    expect(getGenres()).toEqual([{ id: 99, name: 'Existing' }]);
  });

  it('keeps the last value when an ID appears more than once', () => {
    const writer = createGenreWriter(database);

    writer.upsertGenres([
      { id: 14, name: 'Action' },
      { id: 14, name: 'Animation' },
    ]);

    expect(getGenres()).toEqual([{ id: 14, name: 'Animation' }]);
  });

  it('inserts a missing genre placeholder and ignores an existing ID', () => {
    const writer = createGenreWriter(database);

    writer.ensureGenre(21);
    writer.ensureGenre(21);

    expect(getGenres()).toEqual([{ id: 21, name: null }]);
  });
});
