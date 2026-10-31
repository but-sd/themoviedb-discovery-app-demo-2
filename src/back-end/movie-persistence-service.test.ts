import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDatabase } from './database/schema.ts';
import { saveMovieDetails } from './movie-persistence-service.ts';
import type { MovieDetails } from './schemas/MoviesTypes.ts';

const movie: MovieDetails = {
  id: 1,
  title: 'Example',
  original_title: 'Original',
  original_language: 'en',
  overview: 'Overview',
  release_date: '2020-06-01',
  popularity: 10,
  vote_average: 7,
  vote_count: 100,
  poster_path: null,
  backdrop_path: null,
  runtime: 120,
  budget: 1000,
  revenue: 5000,
  genres: [{ id: 28, name: 'Action' }],
  production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
  tagline: null,
};

describe('movie persistence service', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = getDatabase(':memory:');
  });
  afterEach(() => {
    database.close();
  });

  function snapshot() {
    return {
      movies: database.prepare('SELECT * FROM movies ORDER BY id').all(),
      genres: database.prepare('SELECT * FROM genres ORDER BY id').all(),
      countries: database
        .prepare('SELECT * FROM countries ORDER BY code')
        .all(),
      movieGenres: database
        .prepare('SELECT * FROM movie_genres ORDER BY movie_id, genre_id')
        .all(),
      movieCountries: database
        .prepare(
          'SELECT * FROM production_countries ORDER BY movie_id, country_code',
        )
        .all(),
    };
  }

  it('saves genres, countries, the movie and deduplicated associations', () => {
    saveMovieDetails(
      database,
      {
        ...movie,
        genres: [...movie.genres, ...movie.genres],
        production_countries: [
          ...movie.production_countries,
          ...movie.production_countries,
        ],
      },
      'collected',
    );
    const data = snapshot();
    expect(data.genres).toEqual(movie.genres);
    expect(data.countries).toEqual([{ code: 'FR', name: 'France' }]);
    expect(data.movieGenres).toEqual([{ movie_id: 1, genre_id: 28 }]);
    expect(data.movieCountries).toEqual([{ movie_id: 1, country_code: 'FR' }]);
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0]).toMatchObject({
      id: 1,
      title: 'Example',
      collected_at: 'collected',
    });
    expect(database.isTransaction).toBe(false);
  });

  it('preserves existing reference names and replaces only the target movie associations', () => {
    saveMovieDetails(database, movie);
    saveMovieDetails(database, { ...movie, id: 2 });
    saveMovieDetails(database, {
      ...movie,
      title: 'Updated',
      genres: [
        { id: 28, name: 'Updated action' },
        { id: 35, name: 'Comedy' },
      ],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
    });
    expect(snapshot()).toMatchObject({
      genres: [
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ],
      countries: [
        { code: 'FR', name: 'France' },
        { code: 'US', name: 'United States' },
      ],
      movieGenres: [
        { movie_id: 1, genre_id: 28 },
        { movie_id: 1, genre_id: 35 },
        { movie_id: 2, genre_id: 28 },
      ],
      movieCountries: [
        { movie_id: 1, country_code: 'US' },
        { movie_id: 2, country_code: 'FR' },
      ],
    });
    expect(snapshot().movies).toHaveLength(2);
  });

  it('removes obsolete associations for empty detail lists without deleting references', () => {
    saveMovieDetails(database, movie);
    saveMovieDetails(database, {
      ...movie,
      genres: [],
      production_countries: [],
    });
    expect(snapshot()).toMatchObject({
      genres: movie.genres,
      countries: [{ code: 'FR', name: 'France' }],
      movieGenres: [],
      movieCountries: [],
    });
  });

  it('is idempotent when saving the same detail repeatedly', () => {
    saveMovieDetails(database, movie, 'collected');
    const original = snapshot();
    saveMovieDetails(database, movie, 'collected');
    expect(snapshot()).toEqual(original);
  });

  it('maps unknown TMDB numeric values to null without weakening repository constraints', () => {
    saveMovieDetails(database, { ...movie, runtime: 0, budget: 0, revenue: 0 });
    expect(snapshot().movies[0]).toMatchObject({
      runtime_minutes: null,
      budget: null,
      revenue: null,
    });
  });

  it.each([
    'genres',
    'countries',
    'movies',
    'movie_genres',
    'production_countries',
  ])('rolls back every write when inserting into %s fails', (table) => {
    saveMovieDetails(database, movie, 'original');
    const original = snapshot();
    database.exec(`
        CREATE TRIGGER reject_write BEFORE INSERT ON ${table}
        BEGIN SELECT RAISE(ABORT, 'Write failed'); END;
      `);
    expect(() =>
      saveMovieDetails(database, {
        ...movie,
        title: 'Should not persist',
        genres: [{ id: 35, name: 'Comedy' }],
        production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
      }),
    ).toThrow('Write failed');
    expect(snapshot()).toEqual(original);
    expect(database.isTransaction).toBe(false);
  });

  it('does not commit an existing transaction', () => {
    database.exec('BEGIN TRANSACTION;');
    saveMovieDetails(database, movie);
    expect(database.isTransaction).toBe(true);
    expect(snapshot().movies).toHaveLength(1);
    database.exec('ROLLBACK;');
    expect(snapshot()).toEqual({
      movies: [],
      genres: [],
      countries: [],
      movieGenres: [],
      movieCountries: [],
    });
  });

  it('preserves unrelated work in the caller transaction when saving fails', () => {
    database.exec(`
      BEGIN TRANSACTION;
      INSERT INTO genres (id, name) VALUES (99, 'Caller genre');
      CREATE TRIGGER reject_country BEFORE INSERT ON production_countries
      BEGIN SELECT RAISE(ABORT, 'Association failed'); END;
    `);
    expect(() => saveMovieDetails(database, movie)).toThrow(
      'Association failed',
    );
    expect(database.isTransaction).toBe(true);
    expect(snapshot()).toEqual({
      movies: [],
      genres: [{ id: 99, name: 'Caller genre' }],
      countries: [],
      movieGenres: [],
      movieCountries: [],
    });
    database.exec('COMMIT;');
  });
});
