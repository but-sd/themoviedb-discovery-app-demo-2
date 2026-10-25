import { afterEach, expect, it, vi } from 'vitest';
import { fetchCatalogSummary } from './catalog-summary';

afterEach(() => vi.unstubAllGlobals());

it('validates and sorts years and forwards cancellation', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ movieCount: 3, years: [2024, 2020] }),
  });
  vi.stubGlobal('fetch', fetchMock);
  const signal = new AbortController().signal;
  expect(await fetchCatalogSummary(signal)).toEqual({
    movieCount: 3,
    years: [2020, 2024],
  });
  expect(fetchMock).toHaveBeenCalledWith('/api/movies/catalog-summary', {
    signal,
  });
});

it.each([0, 3])(
  'allows catalogs with no known years (%s films)',
  async (movieCount) => {
    const data = { movieCount, years: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
    );
    expect(await fetchCatalogSummary()).toEqual(data);
  },
);

it.each([
  null,
  {},
  { movieCount: -1, years: [] },
  { movieCount: 1.5, years: [] },
  { movieCount: 2, years: [2020, 2020] },
  { movieCount: 2, years: ['2020'] },
  { movieCount: 0, years: [2020] },
  { movieCount: 1, years: [null] },
])('rejects malformed data %j', async (data) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
  await expect(fetchCatalogSummary()).rejects.toThrow('invalides');
});

it('reports HTTP errors and propagates network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchCatalogSummary()).rejects.toThrow('Impossible de charger');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network failure')),
  );
  await expect(fetchCatalogSummary()).rejects.toThrow('Network failure');
});
