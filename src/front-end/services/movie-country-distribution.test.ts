import { afterEach, expect, it, vi } from 'vitest';
import { fetchMovieCountryDistribution } from './movie-country-distribution';

const data = {
  countries: [
    { code: 'US', name: 'United States of America', movieCount: 5 },
    { code: 'BE', name: 'Belgium', movieCount: 1 },
    { code: 'FR', name: 'France', movieCount: 5 },
  ],
  unknownMovieCount: 2,
};
afterEach(() => vi.unstubAllGlobals());

it('sorts countries by count then code and forwards cancellation', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchMovieCountryDistribution(signal)).toEqual({
    countries: [data.countries[2], data.countries[0], data.countries[1]],
    unknownMovieCount: 2,
  });
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/countries/distribution', {
    signal,
  });
});

it.each([0, 10])(
  'accepts a catalog without known countries (%s films)',
  async (unknownMovieCount) => {
    const result = { countries: [], unknownMovieCount };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
    );
    expect(await fetchMovieCountryDistribution()).toEqual(result);
  },
);

it.each([
  null,
  {},
  { ...data, unknownMovieCount: -1 },
  { ...data, unknownMovieCount: 1.5 },
  { ...data, countries: [{ code: 'fr', name: 'France', movieCount: 2 }] },
  { ...data, countries: [{ code: 'FR', name: ' ', movieCount: 2 }] },
  { ...data, countries: [{ code: 'FR', name: 'France', movieCount: 0 }] },
  { ...data, countries: [{ code: 'FR', name: 'France', movieCount: 1.5 }] },
  { ...data, countries: [data.countries[0], data.countries[0]] },
])('rejects invalid country statistics %j', async (result) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
  );
  await expect(fetchMovieCountryDistribution()).rejects.toThrow('invalide');
});

it('reports HTTP errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchMovieCountryDistribution()).rejects.toThrow(
    'Impossible de charger',
  );
});

it('propagates network errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failed')),
  );
  await expect(fetchMovieCountryDistribution()).rejects.toThrow(
    'Network failed',
  );
});
