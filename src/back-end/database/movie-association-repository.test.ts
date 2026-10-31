import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  replaceMovieCountries,
  replaceMovieGenres,
} from './movie-association-repository.ts';
import { getDatabase } from './schema.ts';

describe('movie association repository', () => {
  let database: DatabaseSync;
  beforeEach(() => {
    database = getDatabase(':memory:');
    database.exec(`
      INSERT INTO movies (id, title, original_title, original_language, overview, collected_at)
      VALUES (1, 'One', 'One', 'en', '', 'collected'), (2, 'Two', 'Two', 'en', '', 'collected');
      INSERT INTO genres (id, name) VALUES (28, 'Action'), (35, 'Comedy');
      INSERT INTO countries (code, name) VALUES ('US', 'United States'), ('FR', 'France');
      INSERT INTO movie_genres VALUES (1, 28), (2, 28);
      INSERT INTO production_countries VALUES (1, 'US'), (2, 'US');
    `);
  });
  afterEach(() => {
    database.close();
  });

  describe('replaceMovieGenres', () => {
    it('replaces only the target movie links and deduplicates an iterable', () => {
      function* ids() {
        yield 35;
        yield 35;
      }
      replaceMovieGenres(database, 1, ids());
      expect(
        database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
      ).toEqual([
        { movie_id: 1, genre_id: 35 },
        { movie_id: 2, genre_id: 28 },
      ]);
      expect(database.isTransaction).toBe(false);
    });
    it('clears associations with an empty iterable', () => {
      replaceMovieGenres(database, 1, []);
      expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([
        { movie_id: 2, genre_id: 28 },
      ]);
    });
    it('restores deleted links and removes partial inserts on foreign-key failure', () => {
      expect(() => replaceMovieGenres(database, 1, [35, 999])).toThrow(
        'FOREIGN KEY constraint failed',
      );
      expect(
        database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
      ).toEqual([
        { movie_id: 1, genre_id: 28 },
        { movie_id: 2, genre_id: 28 },
      ]);
      expect(database.isTransaction).toBe(false);
    });
    it('restores links when the iterable throws', () => {
      function* ids() {
        yield 35;
        throw new Error('Iterator failed');
      }
      expect(() => replaceMovieGenres(database, 1, ids())).toThrow(
        'Iterator failed',
      );
      expect(
        database
          .prepare('SELECT genre_id FROM movie_genres WHERE movie_id = 1')
          .get(),
      ).toEqual({ genre_id: 28 });
      expect(database.isTransaction).toBe(false);
    });
    it('leaves the caller transaction open on success and failure', () => {
      database.exec("BEGIN; INSERT INTO genres VALUES (99, 'Caller');");
      replaceMovieGenres(database, 1, [35]);
      expect(() => replaceMovieGenres(database, 1, [28, 999])).toThrow(
        'FOREIGN KEY constraint failed',
      );
      expect(database.isTransaction).toBe(true);
      expect(
        database
          .prepare('SELECT genre_id FROM movie_genres WHERE movie_id = 1')
          .get(),
      ).toEqual({ genre_id: 35 });
      expect(
        database.prepare('SELECT name FROM genres WHERE id = 99').get(),
      ).toEqual({ name: 'Caller' });
      database.exec('ROLLBACK;');
      expect(
        database
          .prepare('SELECT genre_id FROM movie_genres WHERE movie_id = 1')
          .get(),
      ).toEqual({ genre_id: 28 });
    });
  });

  describe('replaceMovieCountries', () => {
    it('replaces only the target movie links and deduplicates an iterable', () => {
      function* codes() {
        yield 'FR';
        yield 'FR';
      }
      replaceMovieCountries(database, 1, codes());
      expect(
        database
          .prepare('SELECT * FROM production_countries ORDER BY movie_id')
          .all(),
      ).toEqual([
        { movie_id: 1, country_code: 'FR' },
        { movie_id: 2, country_code: 'US' },
      ]);
      expect(database.isTransaction).toBe(false);
    });
    it('clears associations with an empty iterable', () => {
      replaceMovieCountries(database, 1, []);
      expect(
        database.prepare('SELECT * FROM production_countries').all(),
      ).toEqual([{ movie_id: 2, country_code: 'US' }]);
    });
    it('restores deleted links and removes partial inserts on foreign-key failure', () => {
      expect(() => replaceMovieCountries(database, 1, ['FR', 'XX'])).toThrow(
        'FOREIGN KEY constraint failed',
      );
      expect(
        database
          .prepare('SELECT * FROM production_countries ORDER BY movie_id')
          .all(),
      ).toEqual([
        { movie_id: 1, country_code: 'US' },
        { movie_id: 2, country_code: 'US' },
      ]);
      expect(database.isTransaction).toBe(false);
    });
    it('restores links when the iterable throws', () => {
      function* codes() {
        yield 'FR';
        throw new Error('Iterator failed');
      }
      expect(() => replaceMovieCountries(database, 1, codes())).toThrow(
        'Iterator failed',
      );
      expect(
        database
          .prepare(
            'SELECT country_code FROM production_countries WHERE movie_id = 1',
          )
          .get(),
      ).toEqual({ country_code: 'US' });
      expect(database.isTransaction).toBe(false);
    });
    it('leaves the caller transaction open on success and failure', () => {
      database.exec("BEGIN; INSERT INTO countries VALUES ('GB', 'Caller');");
      replaceMovieCountries(database, 1, ['FR']);
      expect(() => replaceMovieCountries(database, 1, ['US', 'XX'])).toThrow(
        'FOREIGN KEY constraint failed',
      );
      expect(database.isTransaction).toBe(true);
      expect(
        database
          .prepare(
            'SELECT country_code FROM production_countries WHERE movie_id = 1',
          )
          .get(),
      ).toEqual({ country_code: 'FR' });
      expect(
        database.prepare("SELECT name FROM countries WHERE code = 'GB'").get(),
      ).toEqual({ name: 'Caller' });
      database.exec('ROLLBACK;');
      expect(
        database
          .prepare(
            'SELECT country_code FROM production_countries WHERE movie_id = 1',
          )
          .get(),
      ).toEqual({ country_code: 'US' });
    });
  });
});
