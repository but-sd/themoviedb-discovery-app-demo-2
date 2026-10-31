import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_DATABASE_PATH = '/tmp/movies-default.sqlite';

const closeMock = vi.fn();
const execMock = vi.fn();
const runMock = vi.fn(() => ({ changes: 2 }));
const prepareMock = vi.fn(() => ({ run: runMock }));
const getDatabaseMock = vi.fn(() => ({
  close: closeMock,
  exec: execMock,
  prepare: prepareMock,
}));
const upsertGenresMock = vi.fn();
const upsertCountriesMock = vi.fn();
const importMoviesMock = vi.fn();

vi.mock('./movie-writer.ts', () => ({ importMovies: importMoviesMock }));

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('./database/genre-repository.ts', () => ({
  upsertGenres: upsertGenresMock,
}));

vi.mock('./database/country-repository.ts', () => ({
  upsertCountries: upsertCountriesMock,
}));

/**
 * Executes the backend CLI with the specified command-line arguments
 * @param args The command-line arguments to pass to the CLI
 */
async function runCliWithArgs(args: string[]): Promise<void> {
  const originalArgv = process.argv;
  process.argv = ['node', 'src/back-end/backend-cli.ts', ...args];
  try {
    await import('./backend-cli.ts');
  } finally {
    process.argv = originalArgv;
  }
}

describe('backend-cli.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('imports movies with the selected year, database, language and region', async () => {
    importMoviesMock.mockResolvedValueOnce(3);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCliWithArgs([
        '--path',
        './data/custom.sqlite',
        'add-movies',
        '2020',
        '--language',
        'en-US',
        '--region',
        'US',
      ]);
      expect(getDatabaseMock).toHaveBeenCalledWith('./data/custom.sqlite');
      expect(importMoviesMock).toHaveBeenCalledWith(
        getDatabaseMock.mock.results[0].value,
        {
          year: '2020',
          language: 'en-US',
          region: 'US',
        },
      );
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Imported 3 movies into ${resolve('./data/custom.sqlite')}`,
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses the movie import defaults', async () => {
    importMoviesMock.mockResolvedValueOnce(0);
    await runCliWithArgs(['add-movies', '2020']);
    expect(importMoviesMock).toHaveBeenCalledWith(expect.anything(), {
      year: '2020',
      language: 'fr-FR',
      region: 'FR',
    });
    expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it('closes the database and propagates import failures', async () => {
    importMoviesMock.mockRejectedValueOnce(new Error('TMDB failed'));
    await expect(runCliWithArgs(['add-movies', '2020'])).rejects.toThrow(
      'TMDB failed',
    );
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it('rejects an invalid import year before opening the database', async () => {
    await expect(runCliWithArgs(['add-movies', '20'])).rejects.toThrow(
      'four-digit year',
    );
    expect(getDatabaseMock).not.toHaveBeenCalled();
    expect(importMoviesMock).not.toHaveBeenCalled();
  });

  it('rolls back and closes the database when a country import fails', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'country-import-'));
    const csvFile = join(directory, 'countries.csv');
    writeFileSync(csvFile, 'code,name\nFR,France\n');
    const error = new Error('Country write failed');
    upsertCountriesMock.mockImplementationOnce(() => {
      throw error;
    });

    try {
      await expect(runCliWithArgs(['add-countries', csvFile])).rejects.toThrow(
        error,
      );
      expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
      expect(execMock.mock.calls).toEqual([
        ['BEGIN TRANSACTION;'],
        ['ROLLBACK;'],
      ]);
      expect(closeMock).toHaveBeenCalledOnce();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('adds genres from a CSV file to the selected database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'genre-import-'));
    const csvFile = join(directory, 'genres.csv');
    writeFileSync(csvFile, 'id,name\n28,Action\n35,Comedy\n');
    const databasePath = join(directory, 'movies.sqlite');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await runCliWithArgs(['--path', databasePath, 'add-genres', csvFile]);

      expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
      expect(execMock.mock.calls).toEqual([
        ['BEGIN TRANSACTION;'],
        ['COMMIT;'],
      ]);
      expect(upsertGenresMock).toHaveBeenCalledWith(expect.anything(), [
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ]);
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Imported 2 genres into ${resolve(databasePath)}`,
      );
    } finally {
      logSpy.mockRestore();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('removes only genres not associated with a movie', async () => {
    const databasePath = './data/custom-movies.sqlite';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCliWithArgs(['--path', databasePath, 'clean-genres']);

      expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
      expect(prepareMock).toHaveBeenCalledWith(
        'DELETE FROM genres WHERE NOT EXISTS (SELECT 1 FROM movie_genres WHERE movie_genres.genre_id = genres.id)',
      );
      expect(runMock).toHaveBeenCalledOnce();
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Removed 2 unused genres from ${resolve(databasePath)}`,
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses the default database path when no option is provided', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCliWithArgs([]);

      expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Database available at ${resolve(DEFAULT_DATABASE_PATH)}`,
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses the path passed in --path', async () => {
    const customDatabasePath = './data/custom-movies.sqlite';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCliWithArgs(['--path', customDatabasePath]);

      expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Database available at ${resolve(customDatabasePath)}`,
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
