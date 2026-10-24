import type { DatabaseSync } from 'node:sqlite';

/**
 * Initialisation du schéma de la base de données.
 * @param database La base de données SQLite à initialiser.
 */
export function initializeSchema(database: DatabaseSync): void {
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
}
