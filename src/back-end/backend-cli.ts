#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { upsertGenres } from './database/genre-repository.ts';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';
import { parseGenresCsv } from './genre-csv.ts';

/**
 * Command-line interface for creating and initializing the movies database
 */
const cli = new Command()
  // Define the command for creating the database
  .name('create-database')
  .description('Create and initialize the movies database schema')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(({ path }: { path: string }) => {
    const database = getDatabase(path);
    database.close();
    console.log(`Database available at ${resolve(path)}`);
  })
  .addCommand(
    new Command('add-genres')
      .description('Add or update genres from a CSV file')
      .argument('<csv-file>', 'CSV file with id and name columns')
      .action((csvFile: string) => {
        const genres = parseGenresCsv(readFileSync(csvFile, 'utf8'));
        const { path } = cli.opts<{ path: string }>();
        const database = getDatabase(path);
        try {
          database.exec('BEGIN TRANSACTION;');
          try {
            upsertGenres(database, genres);
            database.exec('COMMIT;');
          } catch (error) {
            database.exec('ROLLBACK;');
            throw error;
          }
        } finally {
          database.close();
        }
        console.log(`Imported ${genres.length} genres into ${resolve(path)}`);
      }),
  );

cli.addCommand(
  new Command('clean-genres')
    .description('Remove genres that are not linked to any movie')
    .action(() => {
      const { path } = cli.opts<{ path: string }>();
      const database = getDatabase(path);
      try {
        const { changes } = database
          .prepare(
            'DELETE FROM genres WHERE NOT EXISTS (SELECT 1 FROM movie_genres WHERE movie_genres.genre_id = genres.id)',
          )
          .run();
        console.log(`Removed ${changes} unused genres from ${resolve(path)}`);
      } finally {
        database.close();
      }
    }),
);

cli.parse();
