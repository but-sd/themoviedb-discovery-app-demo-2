import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { movieDetails } from '../stories/fixtures';

const state = vi.hoisted(() => ({
  id: '1',
  query: '',
  result: null as unknown,
  effect: null as null | (() => () => void),
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () => [
    state.result,
    (result: unknown) => {
      state.result = result;
    },
  ],
  useEffect: (effect: () => () => void) => {
    state.effect = effect;
  },
}));

vi.mock('react-router', () => ({
  useParams: () => ({ id: state.id }),
  useSearchParams: () => [new URLSearchParams(state.query)],
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a {...props} href={to}>
      {children}
    </a>
  ),
}));

import MoviesListPage from './MoviesListPage';
import MovieDetailPage from './MovieDetailPage';

function deferredResponse() {
  let resolve: (response: Response) => void = () => {
    throw new Error('Response resolver is not initialized.');
  };
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  state.id = '1';
  state.query = '';
  state.result = null;
  state.effect = null;
});
afterEach(() => vi.unstubAllGlobals());

it('shows a French error instead of loading forever when the list fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  expect(renderToStaticMarkup(<MoviesListPage />)).toContain(
    'Chargement des films',
  );
  const cleanup = state.effect!();
  await vi.waitFor(() => {
    const markup = renderToStaticMarkup(<MoviesListPage />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Impossible de charger les films populaires');
    expect(markup).not.toContain('Chargement des films');
  });
  cleanup();
});

it('shows the empty list message after a successful empty response', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }),
  );
  renderToStaticMarkup(<MoviesListPage />);
  const cleanup = state.effect!();
  await vi.waitFor(() =>
    expect(renderToStaticMarkup(<MoviesListPage />)).toContain(
      'Aucun film disponible.',
    ),
  );
  cleanup();
});

it('hides the previous movie and ignores a late response after changing IDs', async () => {
  const firstResponse = deferredResponse();
  const fetchMock = vi
    .fn()
    .mockReturnValueOnce(firstResponse.promise)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...movieDetails, id: 2, title: 'Deuxième film' }),
    });
  vi.stubGlobal('fetch', fetchMock);
  state.result = { id: '1', movie: movieDetails, error: '' };
  expect(renderToStaticMarkup(<MovieDetailPage />)).toContain(
    movieDetails.title,
  );
  const cleanupFirst = state.effect!();
  state.id = '2';
  const markup = renderToStaticMarkup(<MovieDetailPage />);
  expect(markup).not.toContain(movieDetails.title);
  expect(markup).toContain('Chargement de la fiche');
  cleanupFirst();
  const cleanupSecond = state.effect!();
  await vi.waitFor(() =>
    expect(renderToStaticMarkup(<MovieDetailPage />)).toContain(
      'Deuxième film',
    ),
  );
  firstResponse.resolve(new Response(JSON.stringify(movieDetails)));
  await firstResponse.promise;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(renderToStaticMarkup(<MovieDetailPage />)).toContain('Deuxième film');
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  cleanupSecond();
});

it('reloads on query changes without showing stale films or allowing an obsolete response', async () => {
  const firstResponse = deferredResponse();
  const fetchMock = vi
    .fn()
    .mockReturnValueOnce(firstResponse.promise)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });
  vi.stubGlobal('fetch', fetchMock);
  renderToStaticMarkup(<MoviesListPage />);
  const cleanupFirst = state.effect!();
  state.query = 'page=2';
  expect(renderToStaticMarkup(<MoviesListPage />)).toContain(
    'Chargement des films',
  );
  cleanupFirst();
  const cleanupSecond = state.effect!();
  await vi.waitFor(() =>
    expect(renderToStaticMarkup(<MoviesListPage />)).toContain(
      'Aucun film disponible.',
    ),
  );
  firstResponse.resolve(
    new Response(
      JSON.stringify({ results: [{ ...movieDetails, genre_ids: [] }] }),
    ),
  );
  await firstResponse.promise;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(renderToStaticMarkup(<MoviesListPage />)).toContain(
    'Aucun film disponible.',
  );
  expect(fetchMock.mock.calls[1][0]).toContain('page=2');
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  cleanupSecond();
});

it('renders one page title with a subordinate film title after loading', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => movieDetails }),
  );
  renderToStaticMarkup(<MovieDetailPage />);
  const cleanup = state.effect!();
  await vi.waitFor(() => {
    const markup = renderToStaticMarkup(<MovieDetailPage />);
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(markup).toContain('<h2 class="movie-detail-title">');
    expect(markup).toContain('href="/exploration"');
  });
  cleanup();
});
