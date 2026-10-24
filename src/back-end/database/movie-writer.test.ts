import { expect, it } from 'vitest';
import { createMoviesDatabase } from './connection';
import { upsertMovies } from './movie-writer';
import type { Movie } from '../schemas/MoviesTypes';

const movie: Movie = {
  id: 1,
  title: 'Original title',
  original_title: 'Original title',
  original_language: 'en',
  overview: '',
  release_date: '2020-01-01',
  popularity: 10,
  vote_average: 7,
  vote_count: 20,
  poster_path: null,
  backdrop_path: null,
  genre_ids: [18],
};

it('stores and updates a movie without a release date while retaining its collection year', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [{ ...movie, release_date: null }], 2020);
    expect(
      database
        .prepare('SELECT release_date, release_year FROM movies WHERE id = ?')
        .get(movie.id),
    ).toEqual({ release_date: null, release_year: 2020 });
    upsertMovies(database, [movie], 2020);
    expect(
      database
        .prepare('SELECT release_date FROM movies WHERE id = ?')
        .get(movie.id),
    ).toEqual({ release_date: movie.release_date });
    upsertMovies(database, [{ ...movie, release_date: null }], 2020);
    expect(
      database
        .prepare('SELECT release_date FROM movies WHERE id = ?')
        .get(movie.id),
    ).toEqual({ release_date: null });
  } finally {
    database.close();
  }
});

it('inserts and updates movies without duplicates', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [movie], 2020);
    upsertMovies(database, [{ ...movie, title: 'Updated title' }], 2020);
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
    ).toMatchObject({ count: 1 });
    expect(
      database.prepare('SELECT * FROM movies WHERE id = 1').get(),
    ).toMatchObject({
      title: 'Updated title',
      release_year: 2020,
    });
  } finally {
    database.close();
  }
});

it('synchronizes genre names and replaces associations without duplicates', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [movie, { ...movie, id: 2 }], 2020, [
      { id: 18, name: 'Drama' },
    ]);
    upsertMovies(database, [{ ...movie, genre_ids: [12, 12] }], 2020, [
      { id: 18, name: 'Drame' },
      { id: 12, name: 'Aventure' },
    ]);
    expect(
      database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
    ).toEqual([
      { movie_id: 1, genre_id: 12 },
      { movie_id: 2, genre_id: 18 },
    ]);
    expect(
      database.prepare('SELECT name FROM genres WHERE id = 18').get(),
    ).toMatchObject({ name: 'Drame' });
    upsertMovies(database, [{ ...movie, genre_ids: [] }], 2020);
    expect(
      database.prepare('SELECT * FROM movie_genres WHERE movie_id = 1').all(),
    ).toEqual([]);
    expect(() =>
      database.prepare('INSERT INTO movie_genres VALUES (999, 18)').run(),
    ).toThrow();
  } finally {
    database.close();
  }
});

it('normalizes production countries into code relations and labels', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(
      database,
      [movie],
      2020,
      [],
      new Map([
        [
          movie.id,
          {
            runtime: null,
            budget: null,
            revenue: null,
            productionCountries: [
              { code: 'FR', name: 'France' },
              { code: 'US', name: 'United States of America' },
            ],
          },
        ],
      ]),
    );
    expect(
      database
        .prepare(
          'SELECT movie_id, country_code FROM production_countries ORDER BY country_code',
        )
        .all(),
    ).toEqual([
      { movie_id: 1, country_code: 'FR' },
      { movie_id: 1, country_code: 'US' },
    ]);
    expect(
      database.prepare('SELECT * FROM countries ORDER BY code').all(),
    ).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'US', name: 'United States of America' },
    ]);

    upsertMovies(
      database,
      [movie],
      2020,
      [],
      new Map([
        [
          movie.id,
          {
            runtime: null,
            budget: null,
            revenue: null,
            productionCountries: [{ code: 'FR', name: 'France (TMDB)' }],
          },
        ],
      ]),
    );
    expect(
      database.prepare('SELECT country_code FROM production_countries').all(),
    ).toEqual([{ country_code: 'FR' }]);
    expect(
      database.prepare('SELECT name FROM countries WHERE code = ?').get('FR'),
    ).toEqual({ name: 'France (TMDB)' });
  } finally {
    database.close();
  }
});

it('rolls back all changes when a write fails and keeps the connection usable', () => {
  const database = createMoviesDatabase(':memory:');
  try {
    upsertMovies(database, [movie], 2020);
    database.exec(`
      CREATE TRIGGER reject_movie BEFORE INSERT ON movies
      WHEN NEW.id = 2
      BEGIN SELECT RAISE(ABORT, 'Rejected movie'); END;
    `);
    expect(() =>
      upsertMovies(
        database,
        [
          { ...movie, title: 'Not saved', genre_ids: [12] },
          { ...movie, id: 2 },
        ],
        2020,
      ),
    ).toThrow('Rejected movie');
    expect(
      database.prepare('SELECT title FROM movies WHERE id = 1').get(),
    ).toMatchObject({ title: movie.title });
    expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([
      { movie_id: 1, genre_id: 18 },
    ]);
    expect(
      database.prepare('SELECT * FROM genres WHERE id = 12').all(),
    ).toEqual([]);
    upsertMovies(database, [{ ...movie, title: 'Saved after rollback' }], 2020);
    expect(
      database.prepare('SELECT title FROM movies WHERE id = 1').get(),
    ).toMatchObject({ title: 'Saved after rollback' });
  } finally {
    database.close();
  }
});
