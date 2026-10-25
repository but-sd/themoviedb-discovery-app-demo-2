import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { initializeSchema } from './schema';

it('creates every table, index and optional movie column in the initial schema', () => {
  const database = new DatabaseSync(':memory:');
  try {
    // Initialize the database schema
    initializeSchema(database);

    // Verify that all expected tables are created
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

    // Verify that all expected indexes are created
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
