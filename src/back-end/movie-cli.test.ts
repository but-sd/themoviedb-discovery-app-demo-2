import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('movie CLI integration', () => {
  let directory: string;
  let databasePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'movie-cli-'));
    databasePath = join(directory, 'movies.sqlite');
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function runCli(failSecondDetail = false) {
    const detail = {
      id: 1,
      title: 'Example',
      original_title: 'Example',
      original_language: 'en',
      overview: 'Overview',
      release_date: '2020-01-01',
      popularity: 10,
      vote_average: 7,
      vote_count: 100,
      poster_path: null,
      backdrop_path: null,
      runtime: 100,
      budget: 1000,
      revenue: 2000,
      genres: [{ id: 28, name: 'Action' }],
      production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
      tagline: null,
    };
    const preload = `
      const detail = ${JSON.stringify(detail)};
      globalThis.fetch = async (input) => {
        const url = new URL(input);
        if (url.pathname === '/3/discover/movie') {
          if (url.searchParams.get('primary_release_year') !== '2020'
              || url.searchParams.get('language') !== 'en-US'
              || url.searchParams.get('region') !== 'US') {
            throw new Error('Unexpected Discover query');
          }
          return new Response(JSON.stringify({
            page: 1, total_pages: 1, total_results: 2,
            results: [1, 2].map(id => ({ ...detail, id, genre_ids: [28] })),
          }));
        }
        if (url.pathname === '/3/movie/1' || url.pathname === '/3/movie/2') {
          if (${failSecondDetail} && url.pathname === '/3/movie/2') {
            return new Response('', { status: 503 });
          }
          return new Response(JSON.stringify({ ...detail, id: Number(url.pathname.split('/').pop()) }));
        }
        throw new Error('Unexpected TMDB request');
      };
    `;
    return spawnSync(
      process.execPath,
      [
        '--import',
        `data:text/javascript,${encodeURIComponent(preload)}`,
        'src/back-end/backend-cli.ts',
        '--path',
        databasePath,
        'add-movies',
        '2020',
        '--language',
        'en-US',
        '--region',
        'US',
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, TMDB_ACCESS_TOKEN: 'test-access-token' },
        timeout: 10000,
      },
    );
  }

  it('runs the real CLI, persists enriched movies and safely reimports them', () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = runCli();
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`Imported 2 movies into ${databasePath}`);
    }
    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database
          .prepare(
            'SELECT id, runtime_minutes, budget, revenue, release_year FROM movies ORDER BY id',
          )
          .all(),
      ).toEqual([
        {
          id: 1,
          runtime_minutes: 100,
          budget: 1000,
          revenue: 2000,
          release_year: 2020,
        },
        {
          id: 2,
          runtime_minutes: 100,
          budget: 1000,
          revenue: 2000,
          release_year: 2020,
        },
      ]);
      expect(
        database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
      ).toEqual([
        { movie_id: 1, genre_id: 28 },
        { movie_id: 2, genre_id: 28 },
      ]);
      expect(
        database
          .prepare('SELECT * FROM production_countries ORDER BY movie_id')
          .all(),
      ).toEqual([
        { movie_id: 1, country_code: 'FR' },
        { movie_id: 2, country_code: 'FR' },
      ]);
    } finally {
      database.close();
    }
  });

  it('exits unsuccessfully on a detail failure and preserves completed movies', () => {
    const result = runCli(true);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Failed to import movie 2 on page 1');
    expect(result.stderr).toContain('TMDB API request failed with status 503');
    expect(result.stdout).not.toContain('Imported');
    const database = new DatabaseSync(databasePath);
    try {
      expect(database.prepare('SELECT id FROM movies').all()).toEqual([
        { id: 1 },
      ]);
    } finally {
      database.close();
    }
  });
});
