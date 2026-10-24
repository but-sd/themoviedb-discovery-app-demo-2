import { afterEach, expect, it, vi } from 'vitest';
import { movieDetails } from '../stories/fixtures';
import { fetchMovieDetails, fetchPopularMovies } from './movies';

afterEach(() => vi.unstubAllGlobals());

it('loads popular films with encoded parameters and cancellation', async () => {
  const movie = { ...movieDetails, genre_ids: [] };
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ results: [movie] }) });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  const query = new URLSearchParams({
    language: 'fr-FR',
    region: 'FR',
    page: '1',
  });
  expect(await fetchPopularMovies(query, signal)).toEqual([movie]);
  expect(fetchMock).toHaveBeenCalledWith(`/api/movies/popular?${query}`, {
    signal,
  });
});

it('accepts an empty list', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }),
  );
  expect(await fetchPopularMovies(new URLSearchParams())).toEqual([]);
});

it.each([
  { error: 'failed' },
  { results: [{}] },
  { results: [{ ...movieDetails, genre_ids: [], vote_average: 11 }] },
])('rejects malformed lists %j', async (data) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
  await expect(fetchPopularMovies(new URLSearchParams())).rejects.toThrow(
    'invalide',
  );
});

it('loads a valid movie detail', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => movieDetails });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchMovieDetails('1', signal)).toEqual(movieDetails);
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/1', { signal });
});

it.each(['', 'undefined', 'abc', '0', '-1', '9007199254740992'])(
  'rejects invalid film IDs %s before fetching',
  async (id) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchMovieDetails(id)).rejects.toThrow('Identifiant');
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each([
  {},
  { ...movieDetails, genres: null },
  { ...movieDetails, production_countries: [{}] },
])('rejects malformed movie details %j', async (data) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
  await expect(fetchMovieDetails('1')).rejects.toThrow('invalide');
});

it.each([404, 500])('reports HTTP errors (%s) explicitly', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
  await expect(fetchMovieDetails('1')).rejects.toThrow(
    status === 404 ? 'Film introuvable' : 'Impossible de charger',
  );
  await expect(fetchPopularMovies(new URLSearchParams())).rejects.toThrow(
    'Impossible de charger',
  );
});

it('propagates network errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failed')),
  );
  await expect(fetchMovieDetails('1')).rejects.toThrow('Network failed');
  await expect(fetchPopularMovies(new URLSearchParams())).rejects.toThrow(
    'Network failed',
  );
});
