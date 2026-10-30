import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCountries } from './database/country-repository';
import { getDatabase } from './database/schema';

const cliPath = resolve('src/back-end/backend-cli.ts');

describe('country CLI integration', () => {
  let directory: string;
  let databasePath: string;
  let csvFile: string;

  beforeEach(() => {
    directory = realpathSync(mkdtempSync(join(tmpdir(), 'country-cli-')));
    databasePath = join(directory, 'custom.sqlite');
    csvFile = join(directory, 'countries.csv');
    writeFileSync(csvFile, 'code,name\nFR,France\nGB,United Kingdom\n');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function runCli(args: string[]): string {
    return execFileSync(process.execPath, [cliPath, ...args], {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  it('imports and updates countries in the selected database and preserves linked countries', () => {
    expect(
      runCli(['--path', databasePath, 'add-countries', csvFile]),
    ).toContain(`Imported 2 countries into ${databasePath}`);
    writeFileSync(csvFile, 'code,name\nFR,French Republic\nUS,United States\n');
    runCli(['--path', databasePath, 'add-countries', csvFile]);

    const database = getDatabase(databasePath);
    try {
      expect(getCountries(database)).toEqual([
        { code: 'FR', name: 'French Republic' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'US', name: 'United States' },
      ]);
      database.exec(`
        INSERT INTO movies (id, title, original_title, original_language, overview, collected_at)
        VALUES (1, 'Movie', 'Movie', 'fr', '', '2026-01-01');
        INSERT INTO production_countries (movie_id, country_code) VALUES (1, 'FR');
        INSERT INTO genres (id, name) VALUES (28, 'Action');
      `);
      expect(runCli(['--path', databasePath, 'clean-countries'])).toContain(
        `Removed 2 unused countries from ${databasePath}`,
      );
      expect(getCountries(database)).toEqual([
        { code: 'FR', name: 'French Republic' },
      ]);
      expect(
        database.prepare('SELECT * FROM production_countries').all(),
      ).toEqual([{ movie_id: 1, country_code: 'FR' }]);
      expect(database.prepare('SELECT * FROM genres').all()).toEqual([
        { id: 28, name: 'Action' },
      ]);
      expect(runCli(['--path', databasePath, 'clean-countries'])).toContain(
        'Removed 0 unused countries',
      );
    } finally {
      database.close();
    }
  });

  it('does not partially import a CSV containing an invalid row', () => {
    runCli(['--path', databasePath, 'add-countries', csvFile]);
    writeFileSync(csvFile, 'code,name\nFR,Changed\ninvalid,Invalid\n');

    expect(() =>
      runCli(['--path', databasePath, 'add-countries', csvFile]),
    ).toThrow('CSV row 3 has an invalid country code');
    const database = getDatabase(databasePath);
    try {
      expect(getCountries(database)).toEqual([
        { code: 'FR', name: 'France' },
        { code: 'GB', name: 'United Kingdom' },
      ]);
    } finally {
      database.close();
    }
  });

  it('imports and cleans countries using the default database path', () => {
    const defaultPath = join(directory, 'data/movies.sqlite');
    expect(runCli(['add-countries', csvFile])).toContain(
      `Imported 2 countries into ${defaultPath}`,
    );
    expect(runCli(['clean-countries'])).toContain(
      `Removed 2 unused countries from ${defaultPath}`,
    );
    const database = getDatabase(defaultPath);
    try {
      expect(getCountries(database)).toEqual([]);
    } finally {
      database.close();
    }
  });
});
