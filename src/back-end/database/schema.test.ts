import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { initializeSchema } from './schema';

it('creates every table, index and optional movie column in the initial schema', () => {
  const database = new DatabaseSync(':memory:');
  try {
    initializeSchema(database);
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name);
    expect(tables).toEqual([
      'countries',
      'genres',
      'movie_genres',
      'movies',
      'production_countries',
    ]);
    const columns = database.prepare('PRAGMA table_info(movies)').all();
    expect(columns).toContainEqual(
      expect.objectContaining({
        name: 'vote_count',
        type: 'INTEGER',
        notnull: 0,
      }),
    );
    expect(columns).toContainEqual(
      expect.objectContaining({
        name: 'vote_average',
        type: 'REAL',
        notnull: 0,
      }),
    );
    expect(columns).toContainEqual(
      expect.objectContaining({ name: 'popularity', type: 'REAL', notnull: 0 }),
    );
    expect(columns).toContainEqual(
      expect.objectContaining({
        name: 'release_date',
        type: 'TEXT',
        notnull: 0,
      }),
    );
    for (const name of ['runtime_minutes', 'budget', 'revenue']) {
      expect(columns).toContainEqual(
        expect.objectContaining({ name, type: 'INTEGER', notnull: 0 }),
      );
    }
    const indexes = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => row.name);
    expect(indexes).toEqual(
      expect.arrayContaining(['movies_release_year', 'movie_genres_genre_id']),
    );
  } finally {
    database.close();
  }
});

it('keeps existing data when initializing the same schema again', () => {
  const database = new DatabaseSync(':memory:');
  try {
    initializeSchema(database);
    database
      .prepare('INSERT INTO countries (code, name) VALUES (?, ?)')
      .run('FR', 'France');
    initializeSchema(database);
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([
      { code: 'FR', name: 'France' },
    ]);
  } finally {
    database.close();
  }
});

it('defines an indexed stored release year that cannot be assigned directly', () => {
  const database = new DatabaseSync(':memory:');
  try {
    initializeSchema(database);
    expect(database.prepare('PRAGMA table_xinfo(movies)').all()).toContainEqual(
      expect.objectContaining({
        name: 'release_year',
        type: 'INTEGER',
        hidden: 3,
      }),
    );
    expect(() =>
      database.exec('UPDATE movies SET release_year = 2024'),
    ).toThrow(/generated column/);
  } finally {
    database.close();
  }
});

it.each(['runtime_minutes', 'budget', 'revenue'])(
  'allows unknown %s but requires positive values when provided',
  (column) => {
    const database = new DatabaseSync(':memory:');
    try {
      initializeSchema(database);
      database.exec(`
        INSERT INTO movies (
          id, title, original_title, original_language, overview,
          release_date, popularity, vote_average, vote_count,
          collected_at
        ) VALUES (1, 'Test', 'Test', 'fr', '', '2020-01-01', 1, 7, 1, '2026-01-01');
      `);
      const update = database.prepare(
        `UPDATE movies SET ${column} = ? WHERE id = 1`,
      );
      expect(() => update.run(0)).toThrow(/CHECK constraint failed/);
      expect(() => update.run(-1)).toThrow(/CHECK constraint failed/);
      update.run(120);
      expect(
        database.prepare(`SELECT ${column} AS value FROM movies`).get(),
      ).toEqual({ value: 120 });
      update.run(null);
      expect(
        database.prepare(`SELECT ${column} AS value FROM movies`).get(),
      ).toEqual({ value: null });
    } finally {
      database.close();
    }
  },
);
