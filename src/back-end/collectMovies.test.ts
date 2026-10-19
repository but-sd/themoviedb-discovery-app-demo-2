import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TmdbMovie } from './schemas/MoviesTypes';

vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));
vi.mock('./discover-movies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./discover-movies')>()),
  fetchMovieGenres: vi.fn().mockResolvedValue([
    { id: 12, name: 'Aventure' },
    { id: 18, name: 'Drame' },
  ]),
}));

import { collectMovies } from './collectMovies';
import { fetchMovieGenres } from './discover-movies';

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
    vi.mocked(fetchMovieGenres).mockResolvedValue([
      { id: 12, name: 'Aventure' },
      { id: 18, name: 'Drame' },
    ]);
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

    expect(await collectMovies(2020, undefined, databasePath)).toEqual({
      year: 2020,
      collected: 2,
      databasePath,
    });
    await collectMovies(2020, undefined, databasePath);

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
        vote_average: 7.5,
      });
      expect(
        database
          .prepare(`
        SELECT genres.name FROM movie_genres
        JOIN genres ON genres.id = movie_genres.genre_id
        WHERE movie_id = 42 ORDER BY genres.id
      `)
          .all(),
      ).toEqual([{ name: 'Aventure' }, { name: 'Drame' }]);
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
    await collectMovies(2020, undefined, databasePath);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        pageResponse(1, 2, [{ ...movie, title: 'Not saved' }]) as Response,
      )
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    await expect(collectMovies(2020, undefined, databasePath)).rejects.toThrow(
      '503',
    );
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
    await expect(collectMovies(20.5, undefined, databasePath)).rejects.toThrow(
      'Year',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not update movies when fetching genres fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 1) as Response);
    await collectMovies(2020, 100, databasePath);
    vi.mocked(fetch).mockResolvedValueOnce(
      pageResponse(1, 1, [{ ...movie, title: 'Not saved' }]) as Response,
    );
    vi.mocked(fetchMovieGenres).mockRejectedValueOnce(
      new Error('Genres unavailable'),
    );
    await expect(collectMovies(2020, 100, databasePath)).rejects.toThrow(
      'Genres unavailable',
    );
    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database.prepare('SELECT title FROM movies WHERE id = 42').get(),
      ).toMatchObject({ title: movie.title });
    } finally {
      database.close();
    }
  });

  it('can collect a limited selection from a year with more than 500 pages', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 501) as Response);
    expect(await collectMovies(2020, 1, databasePath)).toMatchObject({
      collected: 1,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('defaults to exactly 100 unique films and stops fetching once reached', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const page = Number(new URL(String(url)).searchParams.get('page'));
      return pageResponse(
        page,
        10,
        Array.from({ length: 20 }, (_, index) => ({
          ...movie,
          id: (page - 1) * 20 + index,
        })),
      ) as Response;
    });
    expect(await collectMovies(2020, undefined, databasePath)).toMatchObject({
      collected: 100,
    });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('stores no more than the requested count when a page exceeds the limit', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(pageResponse(1, 3) as Response)
      .mockResolvedValueOnce(
        pageResponse(2, 3, [
          movie,
          { ...movie, id: 43 },
          { ...movie, id: 44 },
        ]) as Response,
      );
    expect(await collectMovies(2020, 2, databasePath)).toMatchObject({
      collected: 2,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const database = new DatabaseSync(databasePath);
    try {
      expect(
        database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
      ).toMatchObject({ count: 2 });
    } finally {
      database.close();
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity])(
    'rejects invalid count %s',
    async (limit) => {
      await expect(collectMovies(2020, limit, databasePath)).rejects.toThrow(
        'positive integer',
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('fails explicitly if the requested count requires more than 500 pages', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const page = Number(new URL(String(url)).searchParams.get('page'));
      return pageResponse(page, 501, [{ ...movie, id: page }]) as Response;
    });
    await expect(collectMovies(2020, 501, databasePath)).rejects.toThrow(
      '500 pages',
    );
    expect(fetch).toHaveBeenCalledTimes(500);
  });

  it('persists an empty year successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(pageResponse(1, 0, []) as Response);
    expect(await collectMovies(2020, undefined, databasePath)).toMatchObject({
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
