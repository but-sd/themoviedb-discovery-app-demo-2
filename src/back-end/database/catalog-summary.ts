import type { CatalogSummary } from '../schemas/MoviesTypes';
import { createMoviesDatabase, DEFAULT_DATABASE_PATH } from './connection';

/**
 * Retrieves the summary of the movie catalog from the database.
 * @param databasePath The path to the movies database file.
 * @returns The summary of the movie catalog, including the movie count and the list of release years.
 */
export function getCatalogSummary(
  databasePath = DEFAULT_DATABASE_PATH,
): CatalogSummary {
  const database = createMoviesDatabase(databasePath);
  try {
    // Retrieve the total count of movies in the database
    const count = database
      .prepare('SELECT COUNT(*) AS count FROM movies')
      .get()!; // Non-null assertion since COUNT(*) always returns a row

    // Retrieve the distinct release years of movies in the database
    const years = database
      .prepare(`
      SELECT DISTINCT release_year AS year FROM movies
      WHERE release_year IS NOT NULL ORDER BY release_year
    `)
      .all();

    // Map the retrieved rows to an array of years
    return {
      movieCount: Number(count.count),
      years: years.map((row) => Number(row.year)),
    };
  } finally {
    database.close();
  }
}
