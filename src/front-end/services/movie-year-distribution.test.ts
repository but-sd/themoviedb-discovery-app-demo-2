import { afterEach, expect, it, vi } from 'vitest';
import { fetchMovieYearDistribution } from './movie-year-distribution';

afterEach(() => vi.unstubAllGlobals());

it('loads and sorts year counts and forwards cancellation', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { year: 2024, movieCount: 1 },
      { year: 2020, movieCount: 3 },
    ],
  });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchMovieYearDistribution(signal)).toEqual([
    { year: 2020, movieCount: 3 },
    { year: 2024, movieCount: 1 },
  ]);
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/years/distribution', {
    signal,
  });
});

it('supports an empty database', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
  );
  expect(await fetchMovieYearDistribution()).toEqual([]);
});

it.each([
  null,
  {},
  [{ year: '2020', movieCount: 2 }],
  [{ year: 2020, movieCount: -1 }],
  [{ year: 2020, movieCount: 1.5 }],
  [
    { year: 2020, movieCount: 1 },
    { year: 2020, movieCount: 2 },
  ],
])('rejects invalid distribution %j', async (data) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
  await expect(fetchMovieYearDistribution()).rejects.toThrow('invalide');
});

it('reports HTTP failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchMovieYearDistribution()).rejects.toThrow(
    'Impossible de charger',
  );
});

it('propagates network failures', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failed')),
  );
  await expect(fetchMovieYearDistribution()).rejects.toThrow('Network failed');
});
