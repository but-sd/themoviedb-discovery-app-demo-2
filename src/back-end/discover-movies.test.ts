import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));

import {
  fetchMovieGenres,
  fetchMovieCollectionDetails,
} from './discover-movies';

afterEach(() => vi.unstubAllGlobals());

it.each([0, null])(
  'normalizes unknown financial amounts %s',
  async (amount) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runtime: 120, budget: amount, revenue: amount }),
      }),
    );
    expect(await fetchMovieCollectionDetails(42)).toEqual({
      runtime: 120,
      budget: null,
      revenue: null,
    });
  },
);

it.each([-1, 1.5, '100', undefined])(
  'rejects invalid financial data %s',
  async (budget) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runtime: 120, budget, revenue: 100 }),
      }),
    );
    await expect(fetchMovieCollectionDetails(42)).rejects.toThrow(
      'financial data',
    );
  },
);

it.each([
  [120, 120],
  [0, null],
  [null, null],
])('reads runtime %s from movie details as %s', async (runtime, expected) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runtime, budget: 1000, revenue: 2000 }),
    }),
  );
  expect(await fetchMovieCollectionDetails(42)).toEqual({
    runtime: expected,
    budget: 1000,
    revenue: 2000,
  });
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/movie/42');
});

it('rejects invalid runtime responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runtime: -1 }),
    }),
  );
  await expect(fetchMovieCollectionDetails(42)).rejects.toThrow(
    'invalid runtime',
  );
});

it('fetches the French TMDB movie genre catalog', async () => {
  const genres = [{ id: 18, name: 'Drame' }];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ genres }),
    }),
  );
  expect(await fetchMovieGenres()).toEqual(genres);
  const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
  expect(url.pathname).toBe('/3/genre/movie/list');
  expect(url.searchParams.get('language')).toBe('fr-FR');
});

it('propagates genre catalog errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  await expect(fetchMovieGenres()).rejects.toThrow('503');
});
