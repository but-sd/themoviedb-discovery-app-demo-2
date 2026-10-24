import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initializeSchema } from './schema';

export const DEFAULT_DATABASE_PATH = resolve('data/movies.sqlite');

export function createMoviesDatabase(
  databasePath = DEFAULT_DATABASE_PATH,
): DatabaseSync {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('BEGIN');
    initializeSchema(database);
    database.exec('COMMIT');
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
