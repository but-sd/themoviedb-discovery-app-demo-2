import { afterEach, expect, it, vi } from 'vitest';
import { MOVIE_RUNTIME_RANGES } from '../../back-end/schemas/MoviesTypes';
import { fetchMovieRuntimeDistribution } from './movie-runtime-distribution';

const data = {
  buckets: MOVIE_RUNTIME_RANGES.map(({ label }) => ({ label, movieCount: 2 })),
  unknownMovieCount: 3,
};
afterEach(() => vi.unstubAllGlobals());

it('loads all runtime ranges and forwards cancellation', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchMovieRuntimeDistribution(signal)).toEqual(data);
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/runtimes/distribution', {
    signal,
  });
});

it('accepts an empty distribution with zero counts', async () => {
  const empty = {
    buckets: data.buckets.map((row) => ({ ...row, movieCount: 0 })),
    unknownMovieCount: 0,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => empty }),
  );
  expect(await fetchMovieRuntimeDistribution()).toEqual(empty);
});

it.each([
  null,
  {},
  { ...data, buckets: [] },
  { ...data, unknownMovieCount: -1 },
  { ...data, unknownMovieCount: 1.5 },
  { ...data, buckets: data.buckets.map((row) => ({ ...row, movieCount: -1 })) },
  {
    ...data,
    buckets: data.buckets.map((row) => ({ ...row, movieCount: 1.5 })),
  },
  {
    ...data,
    buckets: data.buckets.map((row) => ({ ...row, label: 'Incorrect' })),
  },
  { ...data, buckets: [...data.buckets].reverse() },
])('rejects malformed distributions %j', async (result) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
  );
  await expect(fetchMovieRuntimeDistribution()).rejects.toThrow('invalide');
});

it('reports HTTP errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchMovieRuntimeDistribution()).rejects.toThrow(
    'Impossible de charger',
  );
});

it('propagates network errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failed')),
  );
  await expect(fetchMovieRuntimeDistribution()).rejects.toThrow(
    'Network failed',
  );
});
