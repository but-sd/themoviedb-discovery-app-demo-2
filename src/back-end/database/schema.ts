import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

// Default path for the movies database
export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');

/**
 * Creates and initializes the database schema for movies, genres, and countries
 * if it does not already exist else returns the existing schema.
 * @param databasePath The path to the SQLite database file.
 * @returns A `DatabaseSync` instance connected to the specified database.
 */
export function getDatabase(
  databasePath = DEFAULT_DATABASE_PATH,
  { force = false }: { force?: boolean } = {},
): DatabaseSync {
  // Create the directory for the database file if it doesn't exist
  mkdirSync(dirname(databasePath), { recursive: true });

  // Initialize the database connection
  const database = new DatabaseSync(databasePath);

  // Before initializing the schema, enable foreign key constraints to ensure referential integrity
  database.exec('PRAGMA foreign_keys = ON;');

  // Begin a transaction to initialize the schema
  database.exec('BEGIN TRANSACTION;');
  try {
    if (force) {
      database.exec(`
        DROP TABLE IF EXISTS movie_genres;
        DROP TABLE IF EXISTS production_countries;
        DROP TABLE IF EXISTS movies;
        DROP TABLE IF EXISTS genres;
        DROP TABLE IF EXISTS countries;
      `);
    }
    initializeSchema(database);
    database.exec('COMMIT;');
    // Schema initialized successfully, commit the transaction
  } catch (error) {
    // An error occurred while initializing the schema, rollback the transaction
    database.exec('ROLLBACK;');
    database.close();
    throw error;
  }

  return database;
}

/**
 * Initializes the database schema.
 * @param database The SQLite database to initialize.
 */
export function initializeSchema(database: DatabaseSync): void {
  initializeMoviesSchema(database);
  initializeGenresSchema(database);
  initializeCountriesSchema(database);
}

/**
 * Initializes the movies table schema.
 * @param database The SQLite database to initialize.
 */
function initializeMoviesSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      original_title TEXT NOT NULL,
      original_language TEXT NOT NULL,
      overview TEXT NOT NULL,
      release_date TEXT,
      release_year INTEGER GENERATED ALWAYS AS (CAST(strftime('%Y', release_date) AS INTEGER)) STORED,
      popularity REAL,
      vote_average REAL,
      vote_count INTEGER,
      poster_path TEXT,
      backdrop_path TEXT,
      runtime_minutes INTEGER CHECK(runtime_minutes IS NULL OR runtime_minutes > 0),
      budget INTEGER CHECK(budget IS NULL OR budget > 0),
      revenue INTEGER CHECK(revenue IS NULL OR revenue > 0),
      collected_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS movies_release_year ON movies(release_year);
  `);
}

/**
 * Initializes the genres table schema.
 * @param database The SQLite database to initialize.
 */
export function initializeGenresSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      genre_id INTEGER NOT NULL REFERENCES genres(id),
      PRIMARY KEY (movie_id, genre_id)
    );
    CREATE INDEX IF NOT EXISTS movie_genres_genre_id ON movie_genres(genre_id);
  `);
}

/**
 * Initializes the countries table schema.
 * @param database The SQLite database to initialize.
 */
function initializeCountriesSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS production_countries (
      movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      country_code TEXT NOT NULL REFERENCES countries(code),
      PRIMARY KEY (movie_id, country_code)
    );
  `);
}
