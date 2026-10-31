import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertMovies } from './movie-repository.ts';
import { getDatabase } from './schema.ts';

type StoredMovie =
  Parameters<typeof upsertMovies>[1] extends Iterable<infer Movie>
    ? Movie
    : never;

function upsertMovie(
  database: DatabaseSync,
  movie: StoredMovie,
  collectedAt?: string,
): void {
  upsertMovies(database, [movie], collectedAt);
}

const movie: StoredMovie = {
  id: 1,
  title: 'Example',
  original_title: 'Original title',
  original_language: 'en',
  overview: 'An example movie',
  release_date: '2020-06-01',
  popularity: 12.5,
  vote_average: 7.8,
  vote_count: 100,
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  runtime: 120,
  budget: 1000,
  revenue: 5000,
};

const collectedAt = '2026-10-31T08:00:00.000Z';

describe('movie-repository', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = getDatabase(':memory:');
  });

  afterEach(() => {
    database.close();
    vi.useRealTimers();
  });

  describe('upsertMovies', () => {
    it.each([
      { field: 'revenue', column: 'revenue' },
      { field: 'runtime', column: 'runtime_minutes' },
    ] as const)(
      'inserts and updates movies with null $field',
      ({ field, column }) => {
        upsertMovies(database, [{ ...movie, [field]: null }], collectedAt);
        expect(
          database.prepare(`SELECT ${column} AS value FROM movies`).get(),
        ).toEqual({ value: null });
        upsertMovies(database, [movie], collectedAt);
        upsertMovies(database, [{ ...movie, [field]: null }], collectedAt);
        expect(
          database.prepare(`SELECT ${column} AS value FROM movies`).all(),
        ).toEqual([{ value: null }]);
      },
    );

    it('inserts and updates movies with a null budget', () => {
      upsertMovies(database, [{ ...movie, budget: null }], collectedAt);
      expect(database.prepare('SELECT budget FROM movies').get()).toEqual({
        budget: null,
      });
      upsertMovies(database, [movie], collectedAt);
      upsertMovies(database, [{ ...movie, budget: null }], collectedAt);
      expect(database.prepare('SELECT budget FROM movies').all()).toEqual([
        { budget: null },
      ]);
    });

    it('inserts all movies in an iterable and keeps the last duplicate value', () => {
      function* movies() {
        yield movie;
        yield { ...movie, id: 2 };
        yield { ...movie, title: 'Updated' };
      }
      upsertMovies(database, movies(), collectedAt);
      expect(
        database.prepare('SELECT id, title FROM movies ORDER BY id').all(),
      ).toEqual([
        { id: 1, title: 'Updated' },
        { id: 2, title: 'Example' },
      ]);
    });

    it('rolls back the whole batch if a later movie is rejected', () => {
      expect(() =>
        upsertMovies(database, [movie, { ...movie, id: 2, budget: -1 }]),
      ).toThrow('CHECK constraint failed');
      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
      expect(database.isTransaction).toBe(false);
    });

    it('accepts an empty iterable without changing existing movies', () => {
      upsertMovies(database, [movie], collectedAt);
      const original = database.prepare('SELECT * FROM movies').all();
      upsertMovies(database, []);
      expect(database.prepare('SELECT * FROM movies').all()).toEqual(original);
    });
    it('participates in a caller transaction without committing it', () => {
      database.exec('BEGIN TRANSACTION;');
      upsertMovie(database, movie, collectedAt);
      expect(database.isTransaction).toBe(true);
      database.exec('ROLLBACK;');
      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
    });

    it('rolls back its own failed write without undoing caller writes', () => {
      database.exec(
        "BEGIN TRANSACTION; INSERT INTO genres (id, name) VALUES (99, 'Caller genre');",
      );
      expect(() => upsertMovie(database, { ...movie, budget: -1 })).toThrow(
        'CHECK constraint failed',
      );
      expect(database.isTransaction).toBe(true);
      expect(database.prepare('SELECT * FROM genres').all()).toEqual([
        { id: 99, name: 'Caller genre' },
      ]);
      database.exec('COMMIT;');
    });

    it('inserts every movie field and derives the release year', () => {
      upsertMovie(database, movie, collectedAt);

      expect(database.prepare('SELECT * FROM movies').all()).toEqual([
        {
          id: movie.id,
          title: movie.title,
          original_title: movie.original_title,
          original_language: movie.original_language,
          overview: movie.overview,
          release_date: movie.release_date,
          release_year: 2020,
          popularity: movie.popularity,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          runtime_minutes: movie.runtime,
          budget: movie.budget,
          revenue: movie.revenue,
          collected_at: collectedAt,
        },
      ]);
      expect(database.isTransaction).toBe(false);
    });

    it('updates all stored fields without duplicating or modifying another movie', () => {
      upsertMovie(database, movie, collectedAt);
      upsertMovie(database, { ...movie, id: 2 }, collectedAt);
      const otherMovie = database
        .prepare('SELECT * FROM movies WHERE id = 2')
        .get();

      upsertMovie(
        database,
        {
          ...movie,
          title: 'Updated',
          original_title: 'Updated original',
          original_language: 'fr',
          overview: 'Updated overview',
          release_date: '2021-07-02',
          popularity: 20.5,
          vote_average: 8.5,
          vote_count: 200,
          poster_path: '/updated-poster.jpg',
          backdrop_path: '/updated-backdrop.jpg',
          runtime: 90,
          budget: 2000,
          revenue: 8000,
        },
        '2026-11-01T08:00:00.000Z',
      );

      expect(
        database.prepare('SELECT * FROM movies WHERE id = 1').get(),
      ).toEqual({
        id: 1,
        title: 'Updated',
        original_title: 'Updated original',
        original_language: 'fr',
        overview: 'Updated overview',
        release_date: '2021-07-02',
        release_year: 2021,
        popularity: 20.5,
        vote_average: 8.5,
        vote_count: 200,
        poster_path: '/updated-poster.jpg',
        backdrop_path: '/updated-backdrop.jpg',
        runtime_minutes: 90,
        budget: 2000,
        revenue: 8000,
        collected_at: '2026-11-01T08:00:00.000Z',
      });
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toEqual({ count: 2 });
      expect(
        database.prepare('SELECT * FROM movies WHERE id = 2').get(),
      ).toEqual(otherMovie);
      expect(database.isTransaction).toBe(false);
    });

    it('defaults collected_at to the current ISO timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(collectedAt));

      upsertMovie(database, movie);

      expect(database.prepare('SELECT collected_at FROM movies').get()).toEqual(
        {
          collected_at: collectedAt,
        },
      );
    });

    it('stores null image paths and runtime and converts an empty release date to null', () => {
      upsertMovie(database, movie, collectedAt);

      upsertMovie(
        database,
        {
          ...movie,
          release_date: '',
          poster_path: null,
          backdrop_path: null,
          runtime: null,
        },
        collectedAt,
      );

      expect(
        database
          .prepare(`
        SELECT release_date, release_year, poster_path, backdrop_path, runtime_minutes
        FROM movies
      `)
          .get(),
      ).toEqual({
        release_date: null,
        release_year: null,
        poster_path: null,
        backdrop_path: null,
        runtime_minutes: null,
      });
    });

    it('does not create genre, country or association records', () => {
      upsertMovie(database, movie, collectedAt);

      expect(database.prepare('SELECT * FROM genres').all()).toEqual([]);
      expect(database.prepare('SELECT * FROM countries').all()).toEqual([]);
      expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([]);
      expect(
        database.prepare('SELECT * FROM production_countries').all(),
      ).toEqual([]);
    });

    it('preserves existing genres, countries and movie associations on update', () => {
      upsertMovie(database, movie, collectedAt);
      database.exec(`
        INSERT INTO genres (id, name) VALUES (28, 'Action');
        INSERT INTO countries (code, name) VALUES ('FR', 'France');
        INSERT INTO movie_genres (movie_id, genre_id) VALUES (1, 28);
        INSERT INTO production_countries (movie_id, country_code) VALUES (1, 'FR');
      `);

      upsertMovie(database, { ...movie, title: 'Updated' }, collectedAt);

      expect(database.prepare('SELECT * FROM genres').all()).toEqual([
        { id: 28, name: 'Action' },
      ]);
      expect(database.prepare('SELECT * FROM countries').all()).toEqual([
        { code: 'FR', name: 'France' },
      ]);
      expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([
        { movie_id: 1, genre_id: 28 },
      ]);
      expect(
        database.prepare('SELECT * FROM production_countries').all(),
      ).toEqual([{ movie_id: 1, country_code: 'FR' }]);
    });

    it.each([
      { field: 'runtime', value: 0, column: 'runtime_minutes' },
      { field: 'runtime', value: -1, column: 'runtime_minutes' },
      { field: 'budget', value: 0, column: 'budget' },
      { field: 'budget', value: -1, column: 'budget' },
      { field: 'revenue', value: 0, column: 'revenue' },
      { field: 'revenue', value: -1, column: 'revenue' },
    ] as const)(
      'rejects $field=$value and rolls back the insert',
      ({ field, value, column }) => {
        expect(() =>
          upsertMovie(database, { ...movie, [field]: value }, collectedAt),
        ).toThrow(
          `CHECK constraint failed: ${column} IS NULL OR ${column} > 0`,
        );

        expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
        expect(database.isTransaction).toBe(false);
        upsertMovie(database, movie, collectedAt);
        expect(database.prepare('SELECT id FROM movies').all()).toEqual([
          { id: 1 },
        ]);
      },
    );

    it('rolls back a rejected update and preserves the previous row', () => {
      upsertMovie(database, movie, collectedAt);
      const original = database.prepare('SELECT * FROM movies').get();

      expect(() =>
        upsertMovie(
          database,
          {
            ...movie,
            title: 'Rejected update',
            budget: -1,
          },
          '2026-11-01T08:00:00.000Z',
        ),
      ).toThrow('CHECK constraint failed');

      expect(database.prepare('SELECT * FROM movies').get()).toEqual(original);
      expect(database.isTransaction).toBe(false);
    });

    it('rolls back trigger side effects and rethrows the database error', () => {
      database.exec(`
        CREATE TABLE movie_audit (movie_id INTEGER);
        CREATE TRIGGER reject_movie AFTER INSERT ON movies BEGIN
          INSERT INTO movie_audit (movie_id) VALUES (NEW.id);
          SELECT RAISE(FAIL, 'Movie write failed');
        END;
      `);

      expect(() => upsertMovie(database, movie, collectedAt)).toThrow(
        'Movie write failed',
      );

      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
      expect(database.prepare('SELECT * FROM movie_audit').all()).toEqual([]);
      expect(database.isTransaction).toBe(false);
    });
  });
});
