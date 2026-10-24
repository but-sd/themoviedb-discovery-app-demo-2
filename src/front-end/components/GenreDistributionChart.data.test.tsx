import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type { GenreRating } from '../../back-end/schemas/MoviesTypes';

const state = vi.hoisted(() => ({
  data: null as GenreRating[] | null,
  error: '',
  index: 0,
  effects: [] as (() => void | (() => void))[],
  chartData: null as { label: string; value: number }[] | null,
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: () => {
    const isData = state.index++ % 2 === 0;
    return [
      isData ? state.data : state.error,
      (value: GenreRating[] | string) => {
        if (typeof value === 'string') state.error = value;
        else state.data = value;
      },
    ];
  },
  useEffect: (effect: () => void | (() => void)) => {
    state.effects.push(effect);
  },
}));
vi.mock('./DistributionChartVisualization', () => ({
  default: ({ data }: { data: { label: string; value: number }[] | null }) => {
    state.chartData = data;
    return null;
  },
}));

import GenreDistributionChart from './GenreDistributionChart';

afterEach(() => vi.unstubAllGlobals());

it.each(['rating', 'weightedRating'] as const)(
  'plots and ranks the actual %s values returned by SQLite',
  async (metric) => {
    state.data = null;
    state.error = '';
    state.effects = [];
    state.index = 0;
    const rows: GenreRating[] = [
      {
        id: 1,
        name: 'Action',
        movieCount: 2,
        averageRating: 9,
        weightedAverageRating: 6,
        voteCount: 100,
      },
      {
        id: 2,
        name: 'Drame',
        movieCount: 3,
        averageRating: 7,
        weightedAverageRating: 8.5,
        voteCount: 200,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => rows });
    vi.stubGlobal('fetch', fetchMock);
    renderToStaticMarkup(
      <GenreDistributionChart revision={null} metric={metric} />,
    );
    const cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.data).not.toBeNull());
    const markup = renderToStaticMarkup(
      <GenreDistributionChart revision={null} metric={metric} />,
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/movies/genres/ratings', {
      signal: expect.any(AbortSignal),
    });
    expect(state.chartData).toEqual(
      metric === 'rating'
        ? [
            { label: 'Action', value: 9 },
            { label: 'Drame', value: 7 },
          ]
        : [
            { label: 'Drame', value: 8.5 },
            { label: 'Action', value: 6 },
          ],
    );
    expect(markup).toContain(
      metric === 'rating'
        ? '<th scope="row">Action</th><td>2</td><td>9</td><td>100</td>'
        : '<th scope="row">Drame</th><td>3</td><td>8,5</td><td>200</td>',
    );
    if (typeof cleanup === 'function') cleanup();
  },
);

it.each([undefined, -1, 10.1, Number.NaN])(
  'rejects invalid weighted ratings %s',
  async (weightedAverageRating) => {
    state.data = null;
    state.error = '';
    state.effects = [];
    state.index = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Action',
            movieCount: 1,
            averageRating: 7,
            voteCount: 10,
            weightedAverageRating,
          },
        ],
      }),
    );
    renderToStaticMarkup(
      <GenreDistributionChart revision={null} metric="weightedRating" />,
    );
    const cleanup = state.effects[0]();
    await vi.waitFor(() =>
      expect(state.error).toBe('Répartition par genre invalide.'),
    );
    expect(state.data).toBeNull();
    if (typeof cleanup === 'function') cleanup();
  },
);
