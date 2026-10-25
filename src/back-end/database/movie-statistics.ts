import type {
  GenreDistribution,
  GenreRating,
  MovieYearDistribution,
  MovieRuntimeDistribution,
  MovieRatingDistribution,
  MovieCountryDistribution,
} from '../schemas/MoviesTypes';
import {
  MOVIE_RUNTIME_RANGES,
  MOVIE_RATING_RANGES,
} from '../schemas/MoviesTypes';
import { createMoviesDatabase, DEFAULT_DATABASE_PATH } from './connection';

export function getMovieCountryDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): MovieCountryDistribution {
  const database = createMoviesDatabase(databasePath);
  try {
    const countries = database
      .prepare(`
      SELECT countries.code, countries.name, COUNT(*) AS movie_count
      FROM production_countries
      JOIN countries ON countries.code = production_countries.country_code
      JOIN movies ON movies.id = production_countries.movie_id
      GROUP BY countries.code, countries.name
      ORDER BY movie_count DESC, countries.code
    `)
      .all();
    const unknown = database
      .prepare(`
      SELECT COUNT(*) AS movie_count FROM movies
      WHERE NOT EXISTS (
        SELECT 1 FROM production_countries WHERE movie_id = movies.id
      )
    `)
      .get();
    if (!unknown) throw new Error('Missing country distribution aggregate.');
    return {
      countries: countries.map((row) => ({
        code: String(row.code),
        name: String(row.name),
        movieCount: Number(row.movie_count),
      })),
      unknownMovieCount: Number(unknown.movie_count),
    };
  } finally {
    database.close();
  }
}

export function getMovieRatingDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): MovieRatingDistribution {
  const database = createMoviesDatabase(databasePath);
  try {
    const columns = MOVIE_RATING_RANGES.map(
      (_, index) => `COUNT(CASE WHEN vote_count > 0 AND vote_average >= ?
        AND vote_average ${index === 9 ? '<=' : '<'} ? THEN 1 END) AS bucket_${index}`,
    );
    const row = database
      .prepare(`
      SELECT ${columns.join(', ')},
        COUNT(CASE WHEN vote_count IS NULL OR vote_count <= 0 OR vote_average IS NULL THEN 1 END) AS unrated_count
      FROM movies
    `)
      .get(...MOVIE_RATING_RANGES.flatMap(({ min, max }) => [min, max]));
    if (!row) throw new Error('Missing rating distribution aggregate.');
    const years = database
      .prepare(`
      SELECT release_year AS year, AVG(vote_average) AS average_rating,
        COUNT(*) AS movie_count
      FROM movies WHERE vote_count > 0 AND vote_average IS NOT NULL AND release_year IS NOT NULL
      GROUP BY release_year ORDER BY release_year
    `)
      .all();
    return {
      buckets: MOVIE_RATING_RANGES.map(({ label }, index) => ({
        label,
        movieCount: Number(row[`bucket_${index}`]),
      })),
      years: years.map((year) => ({
        year: Number(year.year),
        averageRating: Number(year.average_rating),
        movieCount: Number(year.movie_count),
      })),
      unratedMovieCount: Number(row.unrated_count),
    };
  } finally {
    database.close();
  }
}

export function getMovieRuntimeDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): MovieRuntimeDistribution {
  const database = createMoviesDatabase(databasePath);
  try {
    const columns = MOVIE_RUNTIME_RANGES.map(
      (_, index) => `COUNT(CASE WHEN runtime_minutes > 0
        AND runtime_minutes >= ? AND (? IS NULL OR runtime_minutes < ?)
        THEN 1 END) AS bucket_${index}`,
    );
    const row = database
      .prepare(`
      SELECT ${columns.join(', ')},
        COUNT(CASE WHEN runtime_minutes IS NULL OR runtime_minutes <= 0
          THEN 1 END) AS unknown_count
      FROM movies
    `)
      .get(...MOVIE_RUNTIME_RANGES.flatMap(({ min, max }) => [min, max, max]));
    if (!row) throw new Error('Missing runtime distribution aggregate.');
    return {
      buckets: MOVIE_RUNTIME_RANGES.map(({ label }, index) => ({
        label,
        movieCount: Number(row[`bucket_${index}`]),
      })),
      unknownMovieCount: Number(row.unknown_count),
    };
  } finally {
    database.close();
  }
}

export function getMovieYearDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): MovieYearDistribution[] {
  const database = createMoviesDatabase(databasePath);
  try {
    return database
      .prepare(`
        SELECT release_year AS year, COUNT(*) AS movie_count
        FROM movies
        WHERE release_year IS NOT NULL
        GROUP BY release_year
        ORDER BY release_year
      `)
      .all()
      .map((row) => ({
        year: Number(row.year),
        movieCount: Number(row.movie_count),
      }));
  } finally {
    database.close();
  }
}

export function getGenreRatings(
  databasePath = DEFAULT_DATABASE_PATH,
): GenreRating[] {
  const database = createMoviesDatabase(databasePath);
  try {
    return database
      .prepare(`
      SELECT genres.id, genres.name, COUNT(*) AS movie_count,
        AVG(movies.vote_average) AS average_rating,
        SUM(movies.vote_average * movies.vote_count) / SUM(movies.vote_count) AS weighted_average_rating,
        SUM(movies.vote_count) AS vote_count
      FROM movie_genres
      JOIN genres ON genres.id = movie_genres.genre_id
      JOIN movies ON movies.id = movie_genres.movie_id
      WHERE movies.vote_count > 0 AND movies.vote_average IS NOT NULL
      GROUP BY genres.id, genres.name
      ORDER BY average_rating DESC, genres.id
    `)
      .all()
      .map((row) => ({
        id: Number(row.id),
        name: row.name === null ? `Genre ${row.id}` : String(row.name),
        movieCount: Number(row.movie_count),
        averageRating: Number(row.average_rating),
        weightedAverageRating: Number(row.weighted_average_rating),
        voteCount: Number(row.vote_count),
      }));
  } finally {
    database.close();
  }
}

export function getGenreDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): GenreDistribution[] {
  const database = createMoviesDatabase(databasePath);
  try {
    return database
      .prepare(`
      SELECT genres.id, genres.name, COUNT(*) AS movie_count
      FROM movie_genres
      JOIN genres ON genres.id = movie_genres.genre_id
      GROUP BY genres.id, genres.name
      ORDER BY movie_count DESC, genres.id
    `)
      .all()
      .map((row) => ({
        id: Number(row.id),
        name: row.name === null ? `Genre ${row.id}` : String(row.name),
        movieCount: Number(row.movie_count),
      }));
  } finally {
    database.close();
  }
}
