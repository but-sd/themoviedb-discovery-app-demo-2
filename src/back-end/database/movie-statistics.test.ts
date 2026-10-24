import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createMoviesDatabase } from './connection';
import { getCollectionSummary } from './collection-summary';
import {
  getGenreDistribution,
  getGenreRatings,
  getMovieYearDistribution,
  getMovieRuntimeDistribution,
  getMovieRatingDistribution,
  getMovieCountryDistribution,
} from './movie-statistics';
import {
  MOVIE_RUNTIME_RANGES,
  MOVIE_RATING_RANGES,
} from '../schemas/MoviesTypes';
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

it('ranks all production countries, counts coproductions once per country and reports missing countries', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-countries-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getMovieCountryDistribution(path)).toEqual({
      countries: [],
      unknownMovieCount: 0,
    });
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(
        database,
        [movie, { ...movie, id: 2 }, { ...movie, id: 3 }, { ...movie, id: 4 }],
        2020,
      );
      expect(getMovieCountryDistribution(path)).toEqual({
        countries: [],
        unknownMovieCount: 4,
      });
      database.exec(`
        INSERT INTO countries VALUES ('US', 'United States of America'), ('FR', 'France'), ('BE', 'Belgium'), ('DE', 'Germany');
        INSERT INTO production_countries VALUES (1, 'US'), (1, 'FR'), (2, 'FR'), (2, 'US'), (3, 'BE');
        INSERT OR IGNORE INTO production_countries VALUES (1, 'FR');
      `);
      const result = getMovieCountryDistribution(path);
      expect(result).toEqual({
        countries: [
          { code: 'FR', name: 'France', movieCount: 2 },
          { code: 'US', name: 'United States of America', movieCount: 2 },
          { code: 'BE', name: 'Belgium', movieCount: 1 },
        ],
        unknownMovieCount: 1,
      });
      expect(result.countries[0]).toEqual(
        getCollectionSummary(path).topProductionCountry,
      );
      expect(
        result.countries.reduce((sum, row) => sum + row.movieCount, 0),
      ).toBeGreaterThan(getCollectionSummary(path).movieCount);
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('partitions rating boundaries including 0 and 10 and averages rated films per year without vote weighting', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-ratings-'));
  const path = join(directory, 'movies.sqlite');
  const emptyBuckets = MOVIE_RATING_RANGES.map(({ label }) => ({
    label,
    movieCount: 0,
  }));
  try {
    expect(getMovieRatingDistribution(path)).toEqual({
      buckets: emptyBuckets,
      years: [],
      unratedMovieCount: 0,
    });
    const database = createMoviesDatabase(path);
    try {
      const ratings = MOVIE_RATING_RANGES.flatMap(({ min }) => [
        min,
        min + 0.999,
      ]);
      const movies = ratings.map((rating, index) => ({
        ...movie,
        id: index + 1,
        vote_average: rating,
        vote_count: index === 0 ? 1000 : 1,
      }));
      upsertMovies(database, movies, 2020);
      upsertMovies(database, [movies[0]], 2020);
      upsertMovies(
        database,
        [{ ...movie, id: 21, vote_average: 10, vote_count: 5 }],
        2024,
      );
      upsertMovies(
        database,
        [{ ...movie, id: 22, vote_average: 10, vote_count: 0 }],
        2022,
      );
      const result = getMovieRatingDistribution(path);
      expect(result.buckets).toEqual(
        emptyBuckets.map((bucket, index) => ({
          ...bucket,
          movieCount: index === 9 ? 3 : 2,
        })),
      );
      expect(result.unratedMovieCount).toBe(1);
      expect(result.years).toHaveLength(2);
      expect(result.years[0]).toMatchObject({ year: 2020, movieCount: 20 });
      expect(result.years[0].averageRating).toBeCloseTo(
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
        10,
      );
      expect(result.years[1]).toEqual({
        year: 2024,
        averageRating: 10,
        movieCount: 1,
      });
      expect(
        result.buckets.reduce(
          (sum, row) => sum + row.movieCount,
          result.unratedMovieCount,
        ),
      ).toBe(getCollectionSummary(path).movieCount);
      database.exec('UPDATE movies SET vote_count = 0');
      expect(getMovieRatingDistribution(path)).toEqual({
        buckets: emptyBuckets,
        years: [],
        unratedMovieCount: 22,
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('counts every runtime boundary once and keeps unknown durations separate', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-runtimes-'));
  const path = join(directory, 'movies.sqlite');
  const emptyBuckets = MOVIE_RUNTIME_RANGES.map(({ label }) => ({
    label,
    movieCount: 0,
  }));
  try {
    expect(getMovieRuntimeDistribution(path)).toEqual({
      buckets: emptyBuckets,
      unknownMovieCount: 0,
    });
    const database = createMoviesDatabase(path);
    try {
      const runtimes = [
        1,
        59,
        60,
        89,
        90,
        119,
        120,
        149,
        150,
        179,
        180,
        500,
        null,
      ];
      const movies = runtimes.map((_, index) => ({ ...movie, id: index + 1 }));
      upsertMovies(
        database,
        movies,
        2020,
        [],
        new Map(
          runtimes.map((runtime, index) => [
            index + 1,
            { runtime, budget: null, revenue: null, productionCountries: [] },
          ]),
        ),
      );
      upsertMovies(database, [movies[0]], 2020);
      const result = getMovieRuntimeDistribution(path);
      expect(result).toEqual({
        buckets: MOVIE_RUNTIME_RANGES.map(({ label }) => ({
          label,
          movieCount: 2,
        })),
        unknownMovieCount: 1,
      });
      expect(
        result.buckets.reduce(
          (sum, row) => sum + row.movieCount,
          result.unknownMovieCount,
        ),
      ).toBe(getCollectionSummary(path).movieCount);
      database.exec('UPDATE movies SET runtime_minutes = NULL');
      expect(getMovieRuntimeDistribution(path)).toEqual({
        buckets: emptyBuckets,
        unknownMovieCount: runtimes.length,
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('counts distinct stored movies per release year in chronological order', () => {
  const directory = mkdtempSync(join(tmpdir(), 'movie-years-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getMovieYearDistribution(path)).toEqual([]);
    const database = createMoviesDatabase(path);
    try {
      upsertMovies(database, [{ ...movie, id: 3 }], 2024);
      upsertMovies(database, [movie, { ...movie, id: 2 }], 2020);
      upsertMovies(database, [movie], 2020);
      upsertMovies(database, [], 2022);
      expect(getMovieYearDistribution(path)).toEqual([
        { year: 2020, movieCount: 2 },
        { year: 2024, movieCount: 1 },
      ]);
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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
