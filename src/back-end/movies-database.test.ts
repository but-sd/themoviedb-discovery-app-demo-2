import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  createMoviesDatabase,
  getCollectionSummary,
  getGenreDistribution,
  getGenreRatings,
  upsertMovies,
} from './movies-database';
import type { Movie } from './schemas/MoviesTypes';

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

it('averages rated movies per genre without weighting or including unrated films', () => {
  const directory = mkdtempSync(join(tmpdir(), 'genre-ratings-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getGenreRatings(path)).toEqual([]);
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [
          { ...movie, vote_average: 8, vote_count: 10, genre_ids: [18, 12] },
          { ...movie, id: 2, vote_average: 4, vote_count: 100 },
          { ...movie, id: 3, vote_average: 0, vote_count: 0 },
        ],
        2020,
        [
          { id: 18, name: 'Drame' },
          { id: 12, name: 'Aventure' },
        ],
      );
    } finally {
      database.close();
    }
    expect(getGenreRatings(path)).toEqual([
      {
        id: 12,
        name: 'Aventure',
        movieCount: 1,
        averageRating: 8,
        weightedAverageRating: 8,
        voteCount: 10,
      },
      {
        id: 18,
        name: 'Drame',
        movieCount: 2,
        averageRating: 6,
        weightedAverageRating: 480 / 110,
        voteCount: 110,
      },
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('counts each movie once per genre and sorts by descending count', () => {
  const directory = mkdtempSync(join(tmpdir(), 'genre-distribution-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getGenreDistribution(path)).toEqual([]);
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [
          { ...movie, genre_ids: [18, 18, 12] },
          { ...movie, id: 2, genre_ids: [18] },
          { ...movie, id: 3, genre_ids: [] },
        ],
        2020,
        [
          { id: 18, name: 'Drame' },
          { id: 12, name: 'Aventure' },
        ],
      );
    } finally {
      database.close();
    }
    expect(getGenreDistribution(path)).toEqual([
      { id: 18, name: 'Drame', movieCount: 2 },
      { id: 12, name: 'Aventure', movieCount: 1 },
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('summarizes unique films and successful years including empty collections', () => {
  const directory = mkdtempSync(join(tmpdir(), 'collection-summary-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCollectionSummary(path)).toMatchObject({
      movieCount: 0,
      years: [],
      averageRuntime: null,
      runtimeMovieCount: 0,
    });
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(database, [movie], 2020);
      upsertMovies(database, [movie], 2020);
      upsertMovies(database, [], 2021);
    } finally {
      database.close();
    }
    expect(getCollectionSummary(path)).toMatchObject({
      movieCount: 1,
      years: [2020, 2021],
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('averages only known runtimes and updates them without duplicates', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-runtimes-'));
  const path = join(directory, 'movies.sqlite');
  try {
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [movie, { ...movie, id: 2 }, { ...movie, id: 3 }],
        2020,
        [],
        new Map([
          [1, 90],
          [2, 150],
          [3, null],
        ]),
      );
      expect(getCollectionSummary(path)).toMatchObject({
        averageRuntime: 120,
        runtimeMovieCount: 2,
      });
      upsertMovies(database, [movie], 2020, [], new Map([[1, 110]]));
      expect(getCollectionSummary(path)).toMatchObject({
        averageRuntime: 130,
        runtimeMovieCount: 2,
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('summarizes film ratings without weighting, genre duplication, or unrated films', () => {
  const directory = mkdtempSync(join(tmpdir(), 'film-ratings-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCollectionSummary(path)).toMatchObject({
      averageRating: null,
      ratedMovieCount: 0,
    });
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [
          { ...movie, vote_average: 8, vote_count: 10, genre_ids: [18, 12] },
          { ...movie, id: 2, vote_average: 4, vote_count: 100 },
          { ...movie, id: 3, vote_average: 0, vote_count: 0 },
        ],
        2020,
      );
    } finally {
      database.close();
    }
    expect(getCollectionSummary(path)).toMatchObject({
      averageRating: 6,
      ratedMovieCount: 2,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('selects top movies with a minimum vote count and deterministic ties', () => {
  const directory = mkdtempSync(join(tmpdir(), 'top-movies-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCollectionSummary(path)).toMatchObject({
      bestRatedMovie: null,
      mostPopularMovie: null,
    });
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [
          {
            ...movie,
            id: 1,
            vote_average: 10,
            vote_count: 99,
            popularity: 500,
          },
          { ...movie, id: 2, vote_average: 8, vote_count: 100, popularity: 20 },
          { ...movie, id: 3, vote_average: 8, vote_count: 200, popularity: 30 },
        ],
        2020,
      );
    } finally {
      database.close();
    }
    expect(getCollectionSummary(path)).toMatchObject({
      bestRatedMovie: { id: 3, rating: 8, voteCount: 200, year: 2020 },
      mostPopularMovie: { id: 1, popularity: 500 },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
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

it('creates the database schema and can reopen an initialized database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
  const databasePath = join(directory, 'nested', 'movies.sqlite');
  try {
    const database = createMoviesDatabase(databasePath);
    try {
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toMatchObject({ count: 0 });
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
          .all(),
      ).toContainEqual(
        expect.objectContaining({ name: 'movies_release_year' }),
      );
    } finally {
      database.close();
    }

    const reopenedDatabase = createMoviesDatabase(databasePath);
    reopenedDatabase.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
