import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Country } from '../schemas/MoviesTypes';
import {
  getCountries,
  getCountryByCode,
  upsertCountries,
} from './country-repository';
import { initializeSchema } from './schema';

describe('country-repository', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON;');
    initializeSchema(database);
  });

  afterEach(() => {
    database.close();
  });

  it('returns a country by code or undefined for a missing country', () => {
    upsertCountries(database, [{ code: 'FR', name: 'France' }]);

    expect(getCountryByCode(database, 'FR')).toEqual({
      code: 'FR',
      name: 'France',
    });
    expect(getCountryByCode(database, 'GB')).toBeUndefined();
  });

  it('returns countries ordered by code', () => {
    expect(getCountries(database)).toEqual([]);
    upsertCountries(database, [
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
    ]);

    expect(getCountries(database)).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'US', name: 'United States' },
    ]);
  });

  it('updates existing countries and keeps the last value for duplicate codes', () => {
    upsertCountries(database, [{ code: 'FR', name: 'Old name' }]);
    upsertCountries(database, [
      { code: 'FR', name: 'Updated name' },
      { code: 'FR', name: 'France' },
    ]);

    expect(getCountries(database)).toEqual([{ code: 'FR', name: 'France' }]);
  });

  it('accepts any iterable and leaves countries unchanged for an empty iterable', () => {
    function* countries(): Iterable<Country> {
      yield { code: 'FR', name: 'France' };
      yield { code: 'GB', name: 'United Kingdom' };
    }

    upsertCountries(database, countries());
    const before = getCountries(database);
    upsertCountries(database, []);

    expect(before).toHaveLength(2);
    expect(getCountries(database)).toEqual(before);
  });
});
