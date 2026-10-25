import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MoviesInDatabaseCardState } from './MoviesInDatabaseCardView';

const hooks = vi.hoisted(() => ({
  state: { status: 'loading' } as MoviesInDatabaseCardState,
  effect: null as null | (() => () => void),
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () => [
    hooks.state,
    (value: MoviesInDatabaseCardState) => {
      hooks.state = value;
    },
  ],
  useEffect: (effect: () => () => void) => {
    hooks.effect = effect;
  },
}));
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard';

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MoviesInDatabaseCard />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  hooks.state = { status: 'loading' };
  hooks.effect = null;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('loads independently and displays the result without data props', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ movieCount: 12, years: [2020, 2024] }),
  });
  vi.stubGlobal('fetch', fetchMock);
  expect(render()).toContain('<output>Chargement…</output>');
  expect(render()).not.toContain('0 <span>films</span>');
  const cleanup = hooks.effect!();
  await vi.waitFor(() => expect(render()).toContain('12 <span>films</span>'));
  expect(render()).toContain('2020 – 2024');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/movies/catalog-summary');
  cleanup();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

it('shows an error without a retry button or another request', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false });
  vi.stubGlobal('fetch', fetchMock);
  render();
  const cleanup = hooks.effect!();
  await vi.waitFor(() => expect(render()).toContain('role="alert"'));
  expect(render()).not.toContain('<button');
  expect(render()).not.toContain('<a');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  cleanup();
});

it('ignores responses after unmount', async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise<Response>((resolvePromise) => {
        resolve = resolvePromise;
      }),
    ),
  );
  render();
  const cleanup = hooks.effect!();
  cleanup();
  resolve(new Response(JSON.stringify({ movieCount: 12, years: [2020] })));
  await new Promise((done) => setTimeout(done, 0));
  expect(hooks.state).toEqual({ status: 'loading' });
});

it.each([
  new TypeError('Failed to fetch'),
  new SyntaxError('Unexpected token in JSON'),
])(
  'displays a French message and logs technical failures (%s)',
  async (error) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    render();
    const cleanup = hooks.effect!();
    await vi.waitFor(() =>
      expect(render()).toContain('Chargement impossible.'),
    );
    expect(render()).not.toContain(error.message);
    expect(console.error).toHaveBeenCalledWith(
      'Impossible de charger les informations du catalogue :',
      error,
    );
    cleanup();
  },
);
