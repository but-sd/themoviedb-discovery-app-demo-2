import { afterEach, beforeEach, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createMoviesDatabase } from './connection';
import { upsertCountries } from './country-writer';
import type { ProductionCountry } from '../schemas/MoviesTypes';

let database: DatabaseSync;

beforeEach(() => {
  database = createMoviesDatabase(':memory:');
});
afterEach(() => database.close());

it('inserts countries and updates labels without duplicate codes', () => {
  upsertCountries(database, [
    { code: 'FR', name: 'France' },
    { code: 'BE', name: 'Belgium' },
    { code: 'FR', name: 'France (TMDB)' },
  ]);
  expect(
    database.prepare('SELECT * FROM countries ORDER BY code').all(),
  ).toEqual([
    { code: 'BE', name: 'Belgium' },
    { code: 'FR', name: 'France (TMDB)' },
  ]);
  upsertCountries(database, [{ code: 'BE', name: 'Belgique' }]);
  expect(
    database.prepare('SELECT name FROM countries WHERE code = ?').get('BE'),
  ).toEqual({ name: 'Belgique' });
});

it('accepts an iterable and preserves countries on an empty update', () => {
  function* countries(): Iterable<ProductionCountry> {
    yield { code: 'FR', name: 'France' };
  }
  upsertCountries(database, countries());
  upsertCountries(database, []);
  expect(database.prepare('SELECT * FROM countries').all()).toEqual([
    { code: 'FR', name: 'France' },
  ]);
});

it('participates in the caller transaction without committing it', () => {
  database.exec('BEGIN');
  upsertCountries(database, [{ code: 'FR', name: 'France' }]);
  database.exec('ROLLBACK');
  expect(database.prepare('SELECT * FROM countries').all()).toEqual([]);
});
