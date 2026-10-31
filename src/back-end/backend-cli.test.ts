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
const upsertMoviesMock = vi.fn();

vi.mock('./database/movie-repository.ts', () => ({
  upsertMovies: upsertMoviesMock,
}));

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
  it.each([{ options: [] }, { options: ['--path', './data/custom.sqlite'] }])(
    'creates an empty database through the explicit command with %j',
    async ({ options }) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs([...options, 'create-database']);
        expect(getDatabaseMock).toHaveBeenCalledWith(
          options[1] ?? DEFAULT_DATABASE_PATH,
        );
        expect(closeMock).toHaveBeenCalledOnce();
        expect(upsertMoviesMock).not.toHaveBeenCalled();
        expect(upsertGenresMock).not.toHaveBeenCalled();
        expect(upsertCountriesMock).not.toHaveBeenCalled();
        expect(prepareMock).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    },
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it.each([{ options: [] }, { options: ['--path', './data/custom.sqlite'] }])(
    'cleans movies with path options %j',
    async ({ options }) => {
      const path = options[1] ?? DEFAULT_DATABASE_PATH;
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs([...options, 'clean-movies']);
        expect(getDatabaseMock).toHaveBeenCalledWith(path);
        expect(prepareMock).toHaveBeenCalledWith('DELETE FROM movies');
        expect(runMock).toHaveBeenCalledOnce();
        expect(closeMock).toHaveBeenCalledOnce();
        expect(log).toHaveBeenCalledWith(
          `Removed 2 movies from ${resolve(path)}`,
        );
      } finally {
        log.mockRestore();
      }
    },
  );

  it('closes the database and propagates a movie cleanup failure', async () => {
    runMock.mockImplementationOnce(() => {
      throw new Error('Movie deletion failed');
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await expect(runCliWithArgs(['clean-movies'])).rejects.toThrow(
        'Movie deletion failed',
      );
      expect(closeMock).toHaveBeenCalledOnce();
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('imports movies from CSV into the selected database', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runCliWithArgs([
        '--path',
        './data/custom.sqlite',
        'add-movies',
        './src/back-end/fixtures/movies.csv',
      ]);
      expect(getDatabaseMock).toHaveBeenCalledWith('./data/custom.sqlite');
      expect(upsertMoviesMock).toHaveBeenCalledWith(
        getDatabaseMock.mock.results[0].value,
        [
          expect.objectContaining({
            id: 1,
            genres: [28],
          }),
        ],
      );
      expect(closeMock).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(
        `Imported 1 movies into ${resolve('./data/custom.sqlite')}`,
      );
      expect(execMock.mock.calls).toEqual([
        ['BEGIN TRANSACTION;'],
        ['COMMIT;'],
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses the movie import defaults', async () => {
    await runCliWithArgs(['add-movies', './src/back-end/fixtures/movies.csv']);
    expect(upsertMoviesMock).toHaveBeenCalledOnce();
    expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it('closes the database and propagates import failures', async () => {
    upsertMoviesMock.mockImplementationOnce(() => {
      throw new Error('Movie write failed');
    });
    await expect(
      runCliWithArgs(['add-movies', './src/back-end/fixtures/movies.csv']),
    ).rejects.toThrow('Movie write failed');
    expect(closeMock).toHaveBeenCalledOnce();
    expect(execMock.mock.calls).toEqual([
      ['BEGIN TRANSACTION;'],
      ['ROLLBACK;'],
    ]);
  });

  it('rejects a missing CSV file before opening the database', async () => {
    await expect(
      runCliWithArgs(['add-movies', './data/missing-movies.csv']),
    ).rejects.toThrow('ENOENT');
    expect(getDatabaseMock).not.toHaveBeenCalled();
    expect(upsertMoviesMock).not.toHaveBeenCalled();
  });

  it('imports movies without looking up or writing genres and countries', async () => {
    await runCliWithArgs(['add-movies', './src/back-end/fixtures/movies.csv']);
    expect(upsertMoviesMock).toHaveBeenCalledOnce();
    expect(upsertGenresMock).not.toHaveBeenCalled();
    expect(upsertCountriesMock).not.toHaveBeenCalled();
    expect(prepareMock).not.toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledOnce();
    expect(execMock.mock.calls).toEqual([['BEGIN TRANSACTION;'], ['COMMIT;']]);
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
