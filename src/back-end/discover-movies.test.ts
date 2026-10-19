import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));

import { fetchMovieGenres } from './discover-movies';

afterEach(() => vi.unstubAllGlobals());

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
