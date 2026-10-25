import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createMoviesDatabase } from './connection';
import { getCollectionSummary } from './collection-summary';
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

it('counts coproductions per country and deterministically ranks the leading country', () => {
  const directory = mkdtempSync(join(tmpdir(), 'top-country-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCollectionSummary(path).topProductionCountry).toBeNull();
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [movie, { ...movie, id: 2 }, { ...movie, id: 3 }],
        2020,
      );
      expect(getCollectionSummary(path).topProductionCountry).toBeNull();
      database.exec(`
        INSERT INTO countries VALUES ('US', 'United States of America'), ('FR', 'France');
        INSERT INTO production_countries VALUES (1, 'US'), (1, 'FR'), (2, 'FR');
      `);
      expect(getCollectionSummary(path).topProductionCountry).toEqual({
        code: 'FR',
        name: 'France',
        movieCount: 2,
      });
      database.exec("INSERT INTO production_countries VALUES (2, 'US')");
      expect(getCollectionSummary(path).topProductionCountry).toEqual({
        code: 'FR',
        name: 'France',
        movieCount: 2,
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('ranks profitability by ROI, excludes unknown amounts and breaks ties by id', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-profitability-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCollectionSummary(path)).toMatchObject({
      mostProfitableMovie: null,
      leastProfitableMovie: null,
    });
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [movie, ...[2, 3, 4, 5, 6].map((id) => ({ ...movie, id }))],
        2020,
        [],
        new Map([
          [
            1,
            {
              runtime: null,
              budget: 200,
              revenue: 900,
              productionCountries: [],
            },
          ],
          [
            2,
            {
              runtime: null,
              budget: 10000,
              revenue: 20000,
              productionCountries: [],
            },
          ],
          [
            3,
            {
              runtime: null,
              budget: 1000,
              revenue: 250,
              productionCountries: [],
            },
          ],
          [
            4,
            {
              runtime: null,
              budget: null,
              revenue: 1000000,
              productionCountries: [],
            },
          ],
          [
            5,
            {
              runtime: null,
              budget: 1000000,
              revenue: null,
              productionCountries: [],
            },
          ],
          [
            6,
            {
              runtime: null,
              budget: 400,
              revenue: 1800,
              productionCountries: [],
            },
          ],
        ]),
      );
    } finally {
      database.close();
    }
    expect(getCollectionSummary(path)).toMatchObject({
      mostProfitableMovie: {
        id: 1,
        budget: 200,
        revenue: 900,
        returnOnInvestment: 350,
        title: movie.title,
        posterPath: null,
      },
      leastProfitableMovie: {
        id: 3,
        budget: 1000,
        revenue: 250,
        returnOnInvestment: -75,
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('summarizes unique films and only years represented by stored movies', () => {
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
      years: [2020],
    });
    const updatedDatabase = createMoviesDatabase(path);
    try {
      upsertMovies(updatedDatabase, [], 2019);
      upsertMovies(updatedDatabase, [{ ...movie, id: 2 }], 2018);
      upsertMovies(updatedDatabase, [{ ...movie, id: 3 }], 2022);
      upsertMovies(updatedDatabase, [{ ...movie, id: 4 }], 2018);
      expect(getCollectionSummary(path)).toMatchObject({
        movieCount: 4,
        years: [2018, 2020, 2022],
      });
      updatedDatabase.exec('DELETE FROM movies WHERE release_year = 2018');
      expect(getCollectionSummary(path)).toMatchObject({
        movieCount: 2,
        years: [2020, 2022],
      });
    } finally {
      updatedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('keeps missing popularity distinct from zero and excludes it from popularity rankings', () => {
  const directory = mkdtempSync(join(tmpdir(), 'missing-popularity-'));
  const path = join(directory, 'movies.sqlite');
  try {
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [{ ...movie, popularity: null, vote_count: 100 }],
        2020,
      );
      expect(database.prepare('SELECT popularity FROM movies').get()).toEqual({
        popularity: null,
      });
      expect(getCollectionSummary(path)).toMatchObject({
        movieCount: 1,
        mostPopularMovie: null,
        bestRatedMovie: { id: movie.id, popularity: null },
      });
      upsertMovies(database, [{ ...movie, id: 2, popularity: 0 }], 2020);
      expect(getCollectionSummary(path)).toMatchObject({
        mostPopularMovie: { id: 2, popularity: 0 },
      });
      upsertMovies(database, [{ ...movie, id: 2, popularity: null }], 2020);
      expect(getCollectionSummary(path).mostPopularMovie).toBeNull();
    } finally {
      database.close();
    }
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
          [
            1,
            {
              runtime: 90,
              budget: 1000,
              revenue: 2000,
              productionCountries: [],
            },
          ],
          [
            2,
            {
              runtime: 150,
              budget: null,
              revenue: null,
              productionCountries: [],
            },
          ],
          [
            3,
            {
              runtime: null,
              budget: null,
              revenue: null,
              productionCountries: [],
            },
          ],
        ]),
      );
      expect(getCollectionSummary(path)).toMatchObject({
        averageRuntime: 120,
        runtimeMovieCount: 2,
      });
      upsertMovies(
        database,
        [movie],
        2020,
        [],
        new Map([
          [
            1,
            {
              runtime: 110,
              budget: 3000,
              revenue: 4000,
              productionCountries: [],
            },
          ],
        ]),
      );
      expect(
        database
          .prepare(
            'SELECT runtime_minutes, budget, revenue FROM movies WHERE id = 1',
          )
          .get(),
      ).toMatchObject({ runtime_minutes: 110, budget: 3000, revenue: 4000 });
      expect(
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE name = 'movie_runtimes'",
          )
          .all(),
      ).toEqual([]);
      upsertMovies(database, [movie], 2020);
      expect(getCollectionSummary(path)).toMatchObject({
        averageRuntime: 130,
        runtimeMovieCount: 2,
      });
      expect(
        database
          .prepare('SELECT budget, revenue FROM movies WHERE id = 1')
          .get(),
      ).toMatchObject({ budget: 3000, revenue: 4000 });
      upsertMovies(
        database,
        [movie],
        2020,
        [],
        new Map([
          [
            1,
            {
              runtime: null,
              budget: null,
              revenue: null,
              productionCountries: [],
            },
          ],
        ]),
      );
      expect(
        database
          .prepare('SELECT budget, revenue FROM movies WHERE id = 1')
          .get(),
      ).toMatchObject({ budget: null, revenue: null });
      expect(getCollectionSummary(path)).toMatchObject({
        averageRuntime: 150,
        runtimeMovieCount: 1,
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
