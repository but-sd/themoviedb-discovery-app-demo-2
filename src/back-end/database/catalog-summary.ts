import type { CatalogSummary } from '../schemas/MoviesTypes';
import { createMoviesDatabase, DEFAULT_DATABASE_PATH } from './connection';

export function getCatalogSummary(
  databasePath = DEFAULT_DATABASE_PATH,
): CatalogSummary {
  const database = createMoviesDatabase(databasePath);
  try {
    const count = database
      .prepare('SELECT COUNT(*) AS count FROM movies')
      .get();
    if (!count) throw new Error('Missing catalog count.');
    const years = database
      .prepare(`
      SELECT DISTINCT release_year AS year FROM movies
      WHERE release_year IS NOT NULL ORDER BY release_year
    `)
      .all();
    return {
      movieCount: Number(count.count),
      years: years.map((row) => Number(row.year)),
    };
  } finally {
    database.close();
  }
}
