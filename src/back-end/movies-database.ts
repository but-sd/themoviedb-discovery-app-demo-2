import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Movie } from './schemas/MoviesTypes';

export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');

export function createMoviesDatabase(
  databasePath = DEFAULT_DATABASE_PATH,
): DatabaseSync {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
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
        genre_ids TEXT NOT NULL,
        collected_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS movies_release_year ON movies(release_year);
    `);
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
): void {
  const insert = database.prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        release_year, popularity, vote_average, vote_count, poster_path,
        backdrop_path, genre_ids, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        genre_ids = excluded.genre_ids,
        collected_at = excluded.collected_at
    `);
  database.exec('BEGIN');
  try {
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
        JSON.stringify(movie.genre_ids),
        collectedAt,
      );
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
