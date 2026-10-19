import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TmdbMovie } from './schemas/MoviesTypes';

vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));

import { collectMovies } from './collectMovies';

const movie: TmdbMovie = {
  id: 42,
  title: 'Un film',
  original_title: 'A movie',
  original_language: 'en',
  overview: 'Synopsis',
  release_date: '2020-04-01',
  genre_ids: [12, 18],
  popularity: 20,
  vote_average: 7.5,
  vote_count: 100,
  poster_path: null,
  backdrop_path: null,
  adult: false,
  video: false,
};

function pageResponse(page: number, totalPages: number, movies = [movie]) {
  return {
    ok: true,
    json: async () => ({
      page,
      total_pages: totalPages,
      total_results: 2,
      results: movies,
    }),
  };
}

describe('collectMovies', () => {
  let directory: string;
  let databasePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'collect-movies-'));
    databasePath = join(directory, 'movies.sqlite');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(directory, { recursive: true, force: true });
  });

  it('collects all pages and persists movies without duplicates across runs', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(pageResponse(1, 2) as Response)
      .mockResolvedValueOnce(
        pageResponse(2, 2, [{ ...movie, id: 43 }]) as Response,
      )
      .mockResolvedValueOnce(
        pageResponse(1, 1, [
          { ...movie, title: 'Titre actualisé' },
        ]) as Response,
      );

    expect(await collectMovies(2020, databasePath)).toEqual({
      year: 2020,
      collected: 2,
      databasePath,
    });
    await collectMovies(2020, databasePath);

    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toMatchObject({ count: 2 });
      expect(
        database.prepare('SELECT * FROM movies WHERE id = 42').get(),
      ).toMatchObject({
        title: 'Titre actualisé',
        release_year: 2020,
        genre_ids: '[12,18]',
        vote_average: 7.5,
      });
    } finally {
      database.close();
    }
    const urls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) => new URL(String(url)));
    expect(urls[1].searchParams.get('page')).toBe('2');
    expect(urls[1].searchParams.get('primary_release_year')).toBe('2020');
  });

  it('does not change saved data when a later page fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 1) as Response);
    await collectMovies(2020, databasePath);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        pageResponse(1, 2, [{ ...movie, title: 'Not saved' }]) as Response,
      )
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    await expect(collectMovies(2020, databasePath)).rejects.toThrow('503');
    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database.prepare('SELECT title FROM movies WHERE id = 42').get(),
      ).toMatchObject({ title: movie.title });
    } finally {
      database.close();
    }
  });

  it('rejects invalid years before making requests', async () => {
    await expect(collectMovies(20.5, databasePath)).rejects.toThrow('Year');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explicitly rejects years exceeding the TMDB page limit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 501) as Response);
    await expect(collectMovies(2020, databasePath)).rejects.toThrow(
      '500 pages',
    );
  });

  it('persists an empty year successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 0, []) as Response);
    expect(await collectMovies(2020, databasePath)).toMatchObject({
      collected: 0,
    });
    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toMatchObject({ count: 0 });
    } finally {
      database.close();
    }
  });
});
