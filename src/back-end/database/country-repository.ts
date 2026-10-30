import type { DatabaseSync } from 'node:sqlite';
import type { Country } from '../schemas/MoviesTypes';

/**
 * Get a country by its code from the database.
 */
export function getCountryByCode(
  database: DatabaseSync,
  code: string,
): Country | undefined {
  return database
    .prepare('SELECT code, name FROM countries WHERE code = ?')
    .get(code) as Country | undefined;
}

/**
 * Get countries from the database.
 * @param database The SQLite database to query.
 * @returns An array of countries.
 */
export function getCountries(database: DatabaseSync): Country[] {
  return database
    .prepare('SELECT code, name FROM countries ORDER BY code')
    .all() as Country[];
}

/**
 * Upserts the provided countries into the database.
 * If a country with the same code already exists, its name will be updated.
 * @param database The SQLite database to use for the operation.
 * @param countries An iterable of countries to upsert into the database.
 */
export function upsertCountries(
  database: DatabaseSync,
  countries: Iterable<Country>,
): void {
  const upsertCountry = database.prepare(`
    INSERT INTO countries (code, name) VALUES (?, ?)
    ON CONFLICT(code) DO UPDATE SET name = excluded.name
  `);

  for (const country of countries) {
    upsertCountry.run(country.code, country.name);
  }
}
