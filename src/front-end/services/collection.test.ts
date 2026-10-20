import { afterEach, expect, it, vi } from 'vitest';
import { fetchCollectionSummary } from './collection';

afterEach(() => vi.unstubAllGlobals());

const movie = {
  id: 1,
  title: 'Film',
  year: 2020,
  rating: 7,
  voteCount: 10,
  popularity: 5,
  posterPath: null,
  budget: 1000,
  revenue: 250,
  returnOnInvestment: -75,
};
const summary = {
  movieCount: 1,
  topProductionCountry: { code: 'FR', name: 'France', movieCount: 1 },
  years: [2020],
  averageRuntime: null,
  runtimeMovieCount: 0,
  averageRating: 7,
  ratedMovieCount: 1,
  bestRatedMovie: null,
  mostPopularMovie: null,
  mostProfitableMovie: movie,
  leastProfitableMovie: movie,
};

it('accepts a null top country when none are collected', async () => {
  const empty = { ...summary, topProductionCountry: null };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => empty }),
  );
  expect(await fetchCollectionSummary()).toEqual(empty);
});

it.each([
  undefined,
  { code: 'FRA', name: 'France', movieCount: 1 },
  { code: 'FR', name: '', movieCount: 1 },
  { code: 'FR', name: 'France', movieCount: 0 },
  { code: 'FR', name: 'France', movieCount: 1.5 },
])('rejects an invalid top country', async (topProductionCountry) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...summary, topProductionCountry }),
    }),
  );
  await expect(fetchCollectionSummary()).rejects.toThrow('pays de production');
});

it('reads financial highlights including negative ROI', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => summary }),
  );
  expect(await fetchCollectionSummary()).toEqual(summary);
});

it('accepts missing financial data as null highlights', async () => {
  const empty = {
    ...summary,
    mostProfitableMovie: null,
    leastProfitableMovie: null,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => empty }),
  );
  expect(await fetchCollectionSummary()).toEqual(empty);
});

it.each([
  { ...movie, budget: 0 },
  { ...movie, revenue: null },
  { ...movie, returnOnInvestment: Number.NaN },
  undefined,
])('rejects invalid financial highlights', async (invalid) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...summary, leastProfitableMovie: invalid }),
    }),
  );
  await expect(fetchCollectionSummary()).rejects.toThrow('rentabilité');
});
