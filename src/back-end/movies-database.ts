import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { CollectionSummary, Movie } from './schemas/MoviesTypes';

export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');
export type Genre = { id: number; name: string };

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
    return {
      movieCount: Number(count?.count),
      years: years.map((row) => Number(row.year)),
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
      CREATE TABLE IF NOT EXISTS collection_years (
        year INTEGER PRIMARY KEY,
        collected_at TEXT NOT NULL
      );
    `);
    database.exec('COMMIT');
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  year: number,
  genres: Iterable<Genre> = [],
): void {
  const insert = database.prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        release_year, popularity, vote_average, vote_count, poster_path,
        backdrop_path, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        collectedAt,
      );
      deleteLinks.run(movie.id);
      for (const genreId of movie.genre_ids) {
        ensureGenre.run(genreId);
        insertLink.run(movie.id, genreId);
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
