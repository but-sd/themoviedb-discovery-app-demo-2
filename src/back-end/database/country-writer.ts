import type { DatabaseSync } from 'node:sqlite';
import type { ProductionCountry } from '../schemas/MoviesTypes';

/**
 * Upserts the provided production countries into the database.
 * If a country with the same code already exists, its name will be updated.
 * @param database The SQLite database to use for the operation.
 * @param countries An iterable of production countries to upsert into the database.
 */
export function upsertCountries(
  database: DatabaseSync,
  countries: Iterable<ProductionCountry>,
): void {
  const upsertCountry = database.prepare(`
    INSERT INTO countries (code, name) VALUES (?, ?)
    ON CONFLICT(code) DO UPDATE SET name = excluded.name
  `);

  for (const country of countries) {
    upsertCountry.run(country.code, country.name);
  }
}
