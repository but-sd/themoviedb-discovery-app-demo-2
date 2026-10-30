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

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('./database/genre-repository.ts', () => ({
  upsertGenres: upsertGenresMock,
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
