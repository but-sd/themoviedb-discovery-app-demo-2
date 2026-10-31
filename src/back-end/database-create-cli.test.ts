import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { getDatabase } from './database/schema.ts';

describe('database creation CLI', () => {
  it.each(['--force', '-f'])(
    'recreates populated application tables with %s while default creation preserves them',
    (flag) => {
      const directory = mkdtempSync(join(tmpdir(), 'recreate-database-'));
      const path = join(directory, 'movies.sqlite');
      try {
        const database = getDatabase(path);
        database.exec(`
        INSERT INTO movies (id, title, original_title, original_language, overview, collected_at)
        VALUES (1, 'Example', 'Example', 'en', '', 'collected');
        INSERT INTO genres (id, name) VALUES (28, 'Action');
        INSERT INTO countries (code, name) VALUES ('US', 'United States');
        INSERT INTO movie_genres VALUES (1, 28);
        INSERT INTO production_countries VALUES (1, 'US');
        CREATE TABLE unrelated (value TEXT);
        INSERT INTO unrelated VALUES ('preserved');
      `);
        database.close();
        const command = [
          'src/back-end/backend-cli.ts',
          '--path',
          path,
          'create-database',
        ];
        const normal = spawnSync(process.execPath, command, {
          encoding: 'utf8',
          timeout: 10000,
        });
        expect(normal.status, normal.stderr).toBe(0);
        const before = new DatabaseSync(path);
        expect(
          before.prepare('SELECT COUNT(*) AS count FROM movies').get(),
        ).toEqual({ count: 1 });
        before.close();
        const forced = spawnSync(process.execPath, [...command, flag], {
          encoding: 'utf8',
          timeout: 10000,
        });
        expect(forced.status, forced.stderr).toBe(0);
        const after = new DatabaseSync(path);
        try {
          for (const table of [
            'movies',
            'genres',
            'countries',
            'movie_genres',
            'production_countries',
          ]) {
            expect(
              after.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
            ).toEqual({ count: 0 });
          }
          expect(after.prepare('SELECT * FROM unrelated').all()).toEqual([
            { value: 'preserved' },
          ]);
          expect(
            after
              .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
              .all(),
          ).toEqual(
            expect.arrayContaining([
              { name: 'movies_release_year' },
              { name: 'movie_genres_genre_id' },
            ]),
          );
        } finally {
          after.close();
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('recreates an incompatible existing application schema', () => {
    const directory = mkdtempSync(join(tmpdir(), 'legacy-database-'));
    const path = join(directory, 'movies.sqlite');
    try {
      const legacy = new DatabaseSync(path);
      legacy.exec(
        'CREATE TABLE movies (id INTEGER PRIMARY KEY); INSERT INTO movies VALUES (1);',
      );
      legacy.close();
      const result = spawnSync(
        process.execPath,
        [
          'src/back-end/backend-cli.ts',
          '--path',
          path,
          'create-database',
          '--force',
        ],
        { encoding: 'utf8', timeout: 10000 },
      );
      expect(result.status, result.stderr).toBe(0);
      const database = new DatabaseSync(path);
      try {
        expect(
          database
            .prepare(
              'SELECT id, release_year, budget, revenue, runtime_minutes FROM movies',
            )
            .all(),
        ).toEqual([]);
      } finally {
        database.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each([{ args: [] }, { args: ['create-database'] }])(
    'creates only the schema with arguments %j',
    ({ args }) => {
      const directory = mkdtempSync(join(tmpdir(), 'create-database-'));
      const path = join(directory, 'nested', 'movies.sqlite');
      try {
        const env = { ...process.env };
        delete env.TMDB_ACCESS_TOKEN;
        const result = spawnSync(
          process.execPath,
          ['src/back-end/backend-cli.ts', '--path', path, ...args],
          { encoding: 'utf8', env, timeout: 10000 },
        );
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain(`Database available at ${path}`);
        const database = new DatabaseSync(path);
        try {
          const tables = database
            .prepare(
              "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
            )
            .all();
          expect(tables.map((table) => table.name)).toEqual([
            'countries',
            'genres',
            'movie_genres',
            'movies',
            'production_countries',
          ]);
          for (const table of [
            'movies',
            'genres',
            'countries',
            'movie_genres',
            'production_countries',
          ]) {
            expect(
              database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
            ).toEqual({ count: 0 });
          }
        } finally {
          database.close();
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
