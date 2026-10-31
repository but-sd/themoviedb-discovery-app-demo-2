import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDatabase } from './database/schema.ts';
import { upsertMovie } from './database/movie-repository.ts';
import { importMovies } from './movie-writer.ts';
import type { TmdbMovieDetails } from './schemas/MoviesTypes.ts';
import { toSupportedMovieDetails } from './utils.ts';

vi.mock('./config.ts', () => ({ tmdbAccessToken: 'test-access-token' }));

const details: TmdbMovieDetails = {
  adult: false,
  video: false,
  id: 1,
  title: 'Detail title',
  original_title: 'Original title',
  original_language: 'en',
  overview: 'Detail overview',
  release_date: '2020-06-01',
  popularity: 10,
  vote_average: 7.5,
  vote_count: 100,
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  runtime: 120,
  budget: 1000,
  revenue: 5000,
  genres: [{ id: 28, name: 'Action' }],
  production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
  tagline: 'Example',
  production_companies: [],
};

function discoverPage(page: number, ids: number[], totalPages = 2): Response {
  return new Response(
    JSON.stringify({
      page,
      results: ids.map((id) => ({
        ...details,
        id,
        title: 'Discover title',
        genre_ids: [28],
      })),
      total_pages: totalPages,
      total_results: 2,
    }),
  );
}

describe('movie writer', () => {
  let database: DatabaseSync;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    database = getDatabase(':memory:');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    database.close();
    vi.unstubAllGlobals();
  });

  it('imports all pages and stores enriched movies without genres or countries', async () => {
    fetchMock
      .mockResolvedValueOnce(discoverPage(1, [1]))
      .mockResolvedValueOnce(new Response(JSON.stringify(details)))
      .mockResolvedValueOnce(discoverPage(2, [2]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...details, id: 2 })),
      );

    expect(
      await importMovies(database, {
        year: '2020',
        language: 'en-US',
        region: 'US',
      }),
    ).toBe(2);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.themoviedb.org/3/discover/movie?primary_release_year=2020&language=en-US&page=1&region=US',
      'https://api.themoviedb.org/3/movie/1?language=en-US&page=1&region=US',
      'https://api.themoviedb.org/3/discover/movie?primary_release_year=2020&language=en-US&page=2&region=US',
      'https://api.themoviedb.org/3/movie/2?language=en-US&page=1&region=US',
    ]);
    expect(database.prepare('SELECT * FROM movies WHERE id = 1').get()).toEqual(
      {
        id: 1,
        title: details.title,
        original_title: details.original_title,
        original_language: details.original_language,
        overview: details.overview,
        release_date: details.release_date,
        release_year: 2020,
        popularity: details.popularity,
        vote_average: details.vote_average,
        vote_count: details.vote_count,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        runtime_minutes: 120,
        budget: 1000,
        revenue: 5000,
        collected_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    );
    expect(database.prepare('SELECT * FROM genres').all()).toEqual([]);
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([]);
    expect(
      database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
    ).toEqual([]);
    expect(
      database
        .prepare('SELECT * FROM production_countries ORDER BY movie_id')
        .all(),
    ).toEqual([]);
  });

  it('updates existing movies without duplicates and leaves associations untouched', async () => {
    upsertMovie(
      database,
      toSupportedMovieDetails(details),
      '2020-01-01T00:00:00.000Z',
    );
    database.exec(`
      INSERT INTO genres (id, name) VALUES (28, 'Action');
      INSERT INTO countries (code, name) VALUES ('FR', 'France');
      INSERT INTO movie_genres (movie_id, genre_id) VALUES (1, 28);
      INSERT INTO production_countries (movie_id, country_code) VALUES (1, 'FR');
    `);
    const updated = {
      ...details,
      title: 'Updated',
      runtime: 0,
      budget: 0,
      revenue: 0,
      release_date: '',
      poster_path: null,
      backdrop_path: null,
      genres: [{ id: 35, name: 'Comedy' }],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
    };
    fetchMock
      .mockResolvedValueOnce(discoverPage(1, [1], 1))
      .mockResolvedValueOnce(new Response(JSON.stringify(updated)));
    expect(await importMovies(database, { year: '2020' })).toBe(1);
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
    ).toEqual({ count: 1 });
    expect(
      database
        .prepare(
          'SELECT title, runtime_minutes, budget, revenue, release_date, release_year, poster_path, backdrop_path FROM movies',
        )
        .get(),
    ).toEqual({
      title: 'Updated',
      runtime_minutes: null,
      budget: null,
      revenue: null,
      release_date: null,
      release_year: null,
      poster_path: null,
      backdrop_path: null,
    });
    expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([
      { movie_id: 1, genre_id: 28 },
    ]);
    expect(
      database.prepare('SELECT * FROM production_countries').all(),
    ).toEqual([{ movie_id: 1, country_code: 'FR' }]);
    expect(database.prepare('SELECT * FROM genres').all()).toEqual([
      { id: 28, name: 'Action' },
    ]);
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([
      { code: 'FR', name: 'France' },
    ]);
    expect(
      database.prepare('SELECT collected_at FROM movies').get()?.collected_at,
    ).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('preserves the existing movie when a movie update fails', () => {
    upsertMovie(database, toSupportedMovieDetails(details), 'original');
    database.exec(`
      CREATE TRIGGER reject_movie BEFORE UPDATE ON movies
      BEGIN SELECT RAISE(ABORT, 'Movie write failed'); END;
    `);
    expect(() =>
      upsertMovie(database, {
        ...toSupportedMovieDetails(details),
        title: 'Should rollback',
      }),
    ).toThrow('Movie write failed');
    expect(
      database.prepare('SELECT title, collected_at FROM movies').get(),
    ).toEqual({ title: details.title, collected_at: 'original' });
    expect(database.isTransaction).toBe(false);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid financial/runtime data: %s',
    (value) => {
      expect(() =>
        upsertMovie(database, {
          ...toSupportedMovieDetails(details),
          budget: value,
        }),
      ).toThrow('non-negative integers');
      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
    },
  );

  it('accepts movie fields without genre or country properties', () => {
    const {
      genres: _genres,
      production_countries: _countries,
      tagline: _tagline,
      ...movie
    } = toSupportedMovieDetails(details);
    upsertMovie(database, {
      ...movie,
      runtime: null,
    });
    expect(
      database.prepare('SELECT runtime_minutes FROM movies').get(),
    ).toEqual({ runtime_minutes: null });
    expect(database.prepare('SELECT * FROM movie_genres').all()).toEqual([]);
    expect(
      database.prepare('SELECT * FROM production_countries').all(),
    ).toEqual([]);
  });

  it('skips duplicate IDs across pages', async () => {
    fetchMock
      .mockResolvedValueOnce(discoverPage(1, [1]))
      .mockResolvedValueOnce(new Response(JSON.stringify(details)))
      .mockResolvedValueOnce(discoverPage(2, [1]));
    expect(await importMovies(database, { year: '2020' })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns zero for an empty discovery', async () => {
    fetchMock.mockResolvedValueOnce(discoverPage(1, [], 0));
    expect(await importMovies(database, { year: '2020' })).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(['20', '0999', '10000', '2020abc'])(
    'rejects invalid year %s without network calls',
    async (year) => {
      await expect(importMovies(database, { year })).rejects.toThrow(
        'four-digit year',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 501, 1.5])(
    'rejects invalid or inaccessible pagination %s',
    async (totalPages) => {
      fetchMock.mockResolvedValueOnce(discoverPage(1, [1], totalPages));
      await expect(importMovies(database, { year: '2020' })).rejects.toThrow(
        'pagination',
      );
      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
    },
  );

  it('rejects an unexpected page', async () => {
    fetchMock.mockResolvedValueOnce(discoverPage(2, [1]));
    await expect(importMovies(database, { year: '2020' })).rejects.toThrow(
      'pagination',
    );
  });

  it('retains previously imported movies and reports a failed detail request', async () => {
    fetchMock
      .mockResolvedValueOnce(discoverPage(1, [1, 2], 1))
      .mockResolvedValueOnce(new Response(JSON.stringify(details)))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(importMovies(database, { year: '2020' })).rejects.toThrow(
      'Failed to import movie 2 on page 1',
    );
    expect(database.prepare('SELECT id FROM movies').all()).toEqual([
      { id: 1 },
    ]);
  });

  it('does not import a mismatched detail ID', async () => {
    fetchMock
      .mockResolvedValueOnce(discoverPage(1, [1], 1))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...details, id: 2 })),
      );
    await expect(importMovies(database, { year: '2020' })).rejects.toThrow(
      'Failed to import movie 1',
    );
    expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
  });

  it.each(['network', 'http', 'json'])(
    'propagates a Discover %s error',
    async (failure) => {
      if (failure === 'network') {
        fetchMock.mockRejectedValueOnce(new Error('Network failed'));
      } else {
        fetchMock.mockResolvedValueOnce(
          new Response('invalid json', {
            status: failure === 'http' ? 500 : 200,
          }),
        );
      }
      await expect(importMovies(database, { year: '2020' })).rejects.toThrow();
      expect(database.prepare('SELECT * FROM movies').all()).toEqual([]);
    },
  );
});
