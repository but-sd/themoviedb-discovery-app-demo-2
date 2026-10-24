import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  CollectionSummary,
  FinancialMovieHighlight,
  GenreDistribution,
  GenreRating,
  Movie,
  MovieCollectionDetails,
  MovieHighlight,
  MovieYearDistribution,
} from './schemas/MoviesTypes';

export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');
export type Genre = { id: number; name: string };

export function getMovieYearDistribution(
  databasePath = DEFAULT_DATABASE_PATH,
): MovieYearDistribution[] {
  const database = createMoviesDatabase(databasePath);
  try {
    return database
      .prepare(`
        SELECT release_year AS year, COUNT(*) AS movie_count
        FROM movies
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
      WHERE movies.vote_count > 0
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

export function getCollectionSummary(
  databasePath = DEFAULT_DATABASE_PATH,
): CollectionSummary {
  const database = createMoviesDatabase(databasePath);
  try {
    const count = database
      .prepare('SELECT COUNT(*) AS count FROM movies')
      .get();
    const years = database
      .prepare(`
      SELECT year FROM collection_years
      UNION SELECT release_year AS year FROM movies
      ORDER BY year
    `)
      .all();
    const runtime = database
      .prepare(`
      SELECT AVG(runtime_minutes) AS average, COUNT(*) AS count
      FROM movies WHERE runtime_minutes > 0
    `)
      .get();
    const rating = database
      .prepare(`
      SELECT AVG(vote_average) AS average, COUNT(*) AS count
      FROM movies WHERE vote_count > 0
    `)
      .get();
    const bestRated = database
      .prepare(`
      SELECT * FROM movies WHERE vote_count >= 100
      ORDER BY vote_average DESC, vote_count DESC, id LIMIT 1
    `)
      .get();
    const mostPopular = database
      .prepare(`
      SELECT * FROM movies ORDER BY popularity DESC, vote_count DESC, id LIMIT 1
    `)
      .get();
    const topCountry = database
      .prepare(`
      SELECT countries.code, countries.name, COUNT(*) AS movie_count
      FROM production_countries
      JOIN countries ON countries.code = production_countries.country_code
      GROUP BY countries.code, countries.name
      ORDER BY movie_count DESC, countries.code
      LIMIT 1
    `)
      .get();
    function toHighlight(row: typeof bestRated): MovieHighlight | null {
      return row
        ? {
            id: Number(row.id),
            title: String(row.title),
            year: Number(row.release_year),
            rating: Number(row.vote_average),
            voteCount: Number(row.vote_count),
            popularity: Number(row.popularity),
            posterPath:
              row.poster_path === null ? null : String(row.poster_path),
          }
        : null;
    }
    function financialHighlight(
      direction: 'ASC' | 'DESC',
    ): FinancialMovieHighlight | null {
      const row = database
        .prepare(`
        SELECT *, (1.0 * revenue / budget - 1) * 100 AS roi
        FROM movies WHERE budget > 0 AND revenue > 0
        ORDER BY roi ${direction}, id LIMIT 1
      `)
        .get();
      const highlight = toHighlight(row);
      return row && highlight
        ? {
            ...highlight,
            budget: Number(row.budget),
            revenue: Number(row.revenue),
            returnOnInvestment: Number(row.roi),
          }
        : null;
    }
    return {
      movieCount: Number(count?.count),
      topProductionCountry: topCountry
        ? {
            code: String(topCountry.code),
            name: String(topCountry.name),
            movieCount: Number(topCountry.movie_count),
          }
        : null,
      years: years.map((row) => Number(row.year)),
      averageRuntime: runtime?.average == null ? null : Number(runtime.average),
      runtimeMovieCount: Number(runtime?.count),
      averageRating: rating?.average == null ? null : Number(rating.average),
      ratedMovieCount: Number(rating?.count),
      bestRatedMovie: toHighlight(bestRated),
      mostPopularMovie: toHighlight(mostPopular),
      mostProfitableMovie: financialHighlight('DESC'),
      leastProfitableMovie: financialHighlight('ASC'),
    };
  } finally {
    database.close();
  }
}

export function createMoviesDatabase(
  databasePath = DEFAULT_DATABASE_PATH,
): DatabaseSync {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    database.exec('PRAGMA foreign_keys = ON; BEGIN');
    database.exec(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        original_title TEXT NOT NULL,
        original_language TEXT NOT NULL,
        overview TEXT NOT NULL,
        release_date TEXT NOT NULL,
        release_year INTEGER NOT NULL,
        popularity REAL NOT NULL,
        vote_average REAL NOT NULL,
        vote_count INTEGER NOT NULL,
        poster_path TEXT,
        backdrop_path TEXT,
        runtime_minutes INTEGER CHECK(runtime_minutes > 0),
        budget INTEGER CHECK(budget > 0),
        revenue INTEGER CHECK(revenue > 0),
        collected_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS movies_release_year ON movies(release_year);
      CREATE TABLE IF NOT EXISTS genres (
        id INTEGER PRIMARY KEY,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS movie_genres (
        movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id),
        PRIMARY KEY (movie_id, genre_id)
      );
      CREATE INDEX IF NOT EXISTS movie_genres_genre_id ON movie_genres(genre_id);
      CREATE TABLE IF NOT EXISTS countries (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS production_countries (
        movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL REFERENCES countries(code),
        PRIMARY KEY (movie_id, country_code)
      );
      CREATE TABLE IF NOT EXISTS collection_years (
        year INTEGER PRIMARY KEY,
        collected_at TEXT NOT NULL
      );
    `);
    ensureMovieOptionalColumns(database);
    database.exec('COMMIT');
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

function ensureMovieOptionalColumns(database: DatabaseSync): void {
  const columns = new Set(
    database
      .prepare('PRAGMA table_info(movies)')
      .all()
      .map((column) => String(column.name)),
  );
  if (!columns.has('runtime_minutes')) {
    database.exec(
      'ALTER TABLE movies ADD COLUMN runtime_minutes INTEGER CHECK(runtime_minutes > 0)',
    );
  }
  if (!columns.has('budget')) {
    database.exec(
      'ALTER TABLE movies ADD COLUMN budget INTEGER CHECK(budget > 0)',
    );
  }
  if (!columns.has('revenue')) {
    database.exec(
      'ALTER TABLE movies ADD COLUMN revenue INTEGER CHECK(revenue > 0)',
    );
  }
}

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  year: number,
  genres: Iterable<Genre> = [],
  details: ReadonlyMap<number, MovieCollectionDetails> = new Map(),
): void {
  const insert = database.prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        release_year, popularity, vote_average, vote_count, poster_path,
        backdrop_path, runtime_minutes, budget, revenue, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        original_title = excluded.original_title,
        original_language = excluded.original_language,
        overview = excluded.overview,
        release_date = excluded.release_date,
        release_year = excluded.release_year,
        popularity = excluded.popularity,
        vote_average = excluded.vote_average,
        vote_count = excluded.vote_count,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        runtime_minutes = CASE WHEN ? THEN excluded.runtime_minutes ELSE movies.runtime_minutes END,
        budget = CASE WHEN ? THEN excluded.budget ELSE movies.budget END,
        revenue = CASE WHEN ? THEN excluded.revenue ELSE movies.revenue END,
        collected_at = excluded.collected_at
    `);
  database.exec('BEGIN');
  try {
    const upsertGenre = database.prepare(`
      INSERT INTO genres (id, name) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `);
    for (const genre of genres) {
      upsertGenre.run(genre.id, genre.name);
    }
    const ensureGenre = database.prepare(
      'INSERT OR IGNORE INTO genres (id) VALUES (?)',
    );
    const deleteLinks = database.prepare(
      'DELETE FROM movie_genres WHERE movie_id = ?',
    );
    const insertLink = database.prepare(
      'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
    );
    const upsertCountry = database.prepare(`
      INSERT INTO countries (code, name) VALUES (?, ?)
      ON CONFLICT(code) DO UPDATE SET name = excluded.name
    `);
    const deleteProductionCountries = database.prepare(
      'DELETE FROM production_countries WHERE movie_id = ?',
    );
    const insertProductionCountry = database.prepare(
      'INSERT OR IGNORE INTO production_countries (movie_id, country_code) VALUES (?, ?)',
    );
    const collectedAt = new Date().toISOString();
    for (const movie of movies) {
      insert.run(
        movie.id,
        movie.title,
        movie.original_title,
        movie.original_language,
        movie.overview,
        movie.release_date,
        year,
        movie.popularity,
        movie.vote_average,
        movie.vote_count,
        movie.poster_path,
        movie.backdrop_path,
        details.get(movie.id)?.runtime ?? null,
        details.get(movie.id)?.budget ?? null,
        details.get(movie.id)?.revenue ?? null,
        collectedAt,
        Number(details.has(movie.id)),
        Number(details.has(movie.id)),
        Number(details.has(movie.id)),
      );
      deleteLinks.run(movie.id);
      for (const genreId of movie.genre_ids) {
        ensureGenre.run(genreId);
        insertLink.run(movie.id, genreId);
      }
      if (details.has(movie.id)) {
        deleteProductionCountries.run(movie.id);
        for (const country of details.get(movie.id)?.productionCountries ??
          []) {
          upsertCountry.run(country.code, country.name);
          insertProductionCountry.run(movie.id, country.code);
        }
      }
    }
    database
      .prepare(`
      INSERT INTO collection_years (year, collected_at) VALUES (?, ?)
      ON CONFLICT(year) DO UPDATE SET collected_at = excluded.collected_at
    `)
      .run(year, collectedAt);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
