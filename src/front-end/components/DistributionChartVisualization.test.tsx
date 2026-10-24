import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartConfiguration } from 'chart.js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  view: 'horizontal',
  effects: [] as (() => void | (() => void))[],
  update: vi.fn(),
  destroy: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  themeChanged: () => {},
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () => [state.view, vi.fn()],
  useRef: () => ({ current: {} }),
  useEffect: (effect: () => void | (() => void)) => {
    state.effects.push(effect);
  },
}));
vi.mock('chart.js', () => ({
  Chart: Object.assign(
    vi.fn(function (_canvas: unknown, config: ChartConfiguration) {
      return {
        options: config.options,
        update: state.update,
        destroy: state.destroy,
      };
    }),
    { register: vi.fn() },
  ),
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
  ArcElement: {},
  DoughnutController: {},
  PieController: {},
  Legend: {},
}));

import { Chart } from 'chart.js';
import DistributionChartVisualization from './DistributionChartVisualization';

beforeEach(() => {
  vi.clearAllMocks();
  state.effects = [];
  state.view = 'horizontal';
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) => name,
  }));
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        state.themeChanged = callback;
      }
      observe = state.observe;
      disconnect = state.disconnect;
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it.each([
  ['horizontal', 'bar', 'y'],
  ['vertical', 'bar', 'x'],
  ['doughnut', 'doughnut', 'x'],
  ['pie', 'pie', 'x'],
])(
  'renders %s with the genre chart styling and exact data',
  (view, type, axis) => {
    state.view = view;
    const markup = renderToStaticMarkup(
      <DistributionChartVisualization
        data={[
          { label: 'France', value: 4 },
          { label: 'Belgium', value: 2 },
        ]}
        title="Répartition par pays"
        circularDescription="Les parts représentent les associations film/pays."
      />,
    );
    const cleanup = state.effects[0]();
    const config = vi.mocked(Chart).mock.calls[0][1];
    expect('type' in config && config.type).toBe(type);
    expect(config.data.labels).toEqual(['France', 'Belgium']);
    expect(config.data.datasets[0].data).toEqual([4, 2]);
    expect(config.options?.indexAxis).toBe(axis);
    expect(config.options?.responsive).toBe(true);
    expect(config.options?.plugins?.legend?.display).toBe(type !== 'bar');
    expect(config.data.datasets[0].backgroundColor).toEqual([
      'hsl(190, 60%, 48%)',
      `hsl(${190 + 137.508}, 60%, 48%)`,
    ]);
    expect(markup).toContain('role="img"');
    if (type !== 'bar') {
      expect(config.options?.scales).toEqual({});
      expect(markup).toContain('associations film/pays');
    }
    state.themeChanged();
    expect(state.update).toHaveBeenCalledOnce();
    expect(state.observe).toHaveBeenCalledWith(
      {},
      { attributes: true, attributeFilter: ['data-theme'] },
    );
    if (typeof cleanup === 'function') cleanup();
    expect(state.destroy).toHaveBeenCalledOnce();
    expect(state.disconnect).toHaveBeenCalledOnce();
  },
);

it.each(['horizontal', 'vertical'])(
  'keeps average ratings on a 0–10 scale in %s mode',
  (view) => {
    state.view = view;
    const markup = renderToStaticMarkup(
      <DistributionChartVisualization
        data={[
          { label: '2020', value: 5.256 },
          { label: '2024', value: 0 },
        ]}
        title="Note moyenne"
        isRating
      />,
    );
    state.effects[0]();
    const config = vi.mocked(Chart).mock.calls[0][1];
    expect('type' in config && config.type).toBe('bar');
    expect(config.data.datasets[0].data).toEqual([5.256, 0]);
    const scale = config.options?.scales?.[view === 'horizontal' ? 'x' : 'y'];
    expect(scale?.min).toBeUndefined();
    expect(scale?.max).toBe(10);
    expect(scale && 'beginAtZero' in scale && scale.beginAtZero).toBe(true);
    expect(markup.match(/<option /g)).toHaveLength(2);
    expect(markup).not.toContain('Camembert');
  },
);

it.each(['pie', 'doughnut'])(
  'explains all-zero datasets instead of displaying an empty %s',
  (view) => {
    state.view = view;
    const markup = renderToStaticMarkup(
      <DistributionChartVisualization
        data={[{ label: 'Moins de 1 h', value: 0 }]}
        title="Durées"
      />,
    );
    state.effects[0]();
    expect(Chart).not.toHaveBeenCalled();
    expect(markup).toContain('Aucune valeur positive');
    expect(markup).not.toContain('<canvas');
  },
);

it.each([null, []])('does not create a chart for missing data %j', (data) => {
  const markup = renderToStaticMarkup(
    <DistributionChartVisualization data={data} title="Films" />,
  );
  state.effects[0]();
  expect(Chart).not.toHaveBeenCalled();
  expect(markup).not.toContain('<canvas');
});
