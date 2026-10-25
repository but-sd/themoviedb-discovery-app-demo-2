import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initializeSchema } from './schema';

// Default path for the movies database
export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');

/**
 * Creates and initializes the movies database if it doesn't exist.
 * @param databasePath The path to the SQLite database file.
 * @returns A `DatabaseSync` instance connected to the specified database.
 */
export function createMoviesDatabase(
  databasePath = DEFAULT_DATABASE_PATH,
): DatabaseSync {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    // Enable foreign key constraints
    database.exec('PRAGMA foreign_keys = ON');

    // Begin a transaction to initialize the schema
    database.exec('BEGIN');
    initializeSchema(database);
    database.exec('COMMIT');
    // Schema initialized successfully

    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
