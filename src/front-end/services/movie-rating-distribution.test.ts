import { afterEach, expect, it, vi } from 'vitest';
import { MOVIE_RATING_RANGES } from '../../back-end/schemas/MoviesTypes';
import { fetchMovieRatingDistribution } from './movie-rating-distribution';

const buckets = MOVIE_RATING_RANGES.map(({ label }) => ({
  label,
  movieCount: 1,
}));
const data = {
  buckets,
  years: [
    { year: 2024, averageRating: 8.25, movieCount: 4 },
    { year: 2020, averageRating: 0, movieCount: 6 },
  ],
  unratedMovieCount: 3,
};
afterEach(() => vi.unstubAllGlobals());

it('validates both graphs, sorts years and forwards cancellation', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchMovieRatingDistribution(signal)).toEqual({
    ...data,
    years: [...data.years].sort((a, b) => a.year - b.year),
  });
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/ratings/distribution', {
    signal,
  });
});

it('accepts empty and unrated-only catalogs', async () => {
  for (const unratedMovieCount of [0, 10]) {
    const result = {
      buckets: buckets.map((row) => ({ ...row, movieCount: 0 })),
      years: [],
      unratedMovieCount,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
    );
    expect(await fetchMovieRatingDistribution()).toEqual(result);
  }
});

it.each([
  null,
  {},
  { ...data, buckets: [] },
  { ...data, unratedMovieCount: -1 },
  { ...data, buckets: buckets.map((row) => ({ ...row, label: 'Incorrect' })) },
  { ...data, buckets: buckets.map((row) => ({ ...row, movieCount: -1 })) },
  { ...data, buckets: buckets.map((row) => ({ ...row, movieCount: 1.5 })) },
  { ...data, years: [{ year: 2020, averageRating: 10.1, movieCount: 10 }] },
  { ...data, years: [{ year: 2020, averageRating: -1, movieCount: 10 }] },
  {
    ...data,
    years: [{ year: 2020, averageRating: Number.NaN, movieCount: 10 }],
  },
  { ...data, years: [{ year: '2020', averageRating: 8, movieCount: 10 }] },
  { ...data, years: [{ year: 2020, averageRating: 8, movieCount: 0 }] },
  {
    ...data,
    years: [
      { year: 2020, averageRating: 8, movieCount: 5 },
      { year: 2020, averageRating: 9, movieCount: 5 },
    ],
  },
  { ...data, years: [] },
])('rejects invalid or inconsistent statistics %j', async (result) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
  );
  await expect(fetchMovieRatingDistribution()).rejects.toThrow('invalides');
});

it('reports HTTP failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchMovieRatingDistribution()).rejects.toThrow(
    'Impossible de charger',
  );
});

it('propagates network failures', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failed')),
  );
  await expect(fetchMovieRatingDistribution()).rejects.toThrow(
    'Network failed',
  );
});
