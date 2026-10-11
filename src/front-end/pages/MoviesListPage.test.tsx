// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Movie } from '../../back-end/schemas/MoviesTypes';
import MoviesListPage from './MoviesListPage';

const observers: ObserverMock[] = [];

class ObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(
    private callback: (entries: { isIntersecting: boolean }[]) => void,
    public options: IntersectionObserverInit,
  ) {
    observers.push(this);
  }

  intersect(isIntersecting = true) {
    this.callback([{ isIntersecting }]);
  }
}

function movie(id: number): Movie {
  return {
    id,
    title: `Film ${id}`,
    original_title: `Film ${id}`,
    original_language: 'fr',
    release_date: '2026-01-01',
    vote_average: 7,
    vote_count: 10,
    overview: '',
    popularity: 1,
    genre_ids: [],
    backdrop_path: null,
    poster_path: null,
  };
}

function pageResponse(page: number, ids: number[], totalPages = 3) {
  return new Response(
    JSON.stringify({
      page,
      results: ids.map(movie),
      total_pages: totalPages,
      total_results: 60,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('MoviesListPage infinite scrolling', () => {
  let container: HTMLDivElement;
  let root: Root;
  let router: ReturnType<typeof createMemoryRouter>;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    observers.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('IntersectionObserver', ObserverMock);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function render(search = '', strict = false) {
    router = createMemoryRouter(
      [{ path: '/movies', element: <MoviesListPage /> }],
      { initialEntries: [`/movies${search}`] },
    );
    await act(async () => {
      root.render(
        strict ? (
          <StrictMode>
            <RouterProvider router={router} />
          </StrictMode>
        ) : (
          <RouterProvider router={router} />
        ),
      );
    });
  }

  function titles() {
    return Array.from(
      container.querySelectorAll('.movie-grid h2'),
      (node) => node.textContent,
    );
  }

  async function clickLoadMore() {
    const button =
      container.querySelector<HTMLButtonElement>('.load-more-button');
    expect(button).not.toBeNull();
    await act(async () => button?.click());
  }

  it('appends successive pages near the bottom and removes duplicate movie IDs', async () => {
    fetchMock
      .mockResolvedValueOnce(pageResponse(1, [1, 2]))
      .mockResolvedValueOnce(pageResponse(2, [2, 3, 3]))
      .mockResolvedValueOnce(pageResponse(3, [4]));
    await render();
    expect(titles()).toEqual(['Film 1', 'Film 2']);
    expect(observers[0].options.rootMargin).toBe('300px');
    expect(observers[0].observe).toHaveBeenCalledWith(
      container.querySelector('.movie-pagination'),
    );

    await act(async () => observers[0].intersect(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => observers[0].intersect());
    expect(titles()).toEqual(['Film 1', 'Film 2', 'Film 3']);
    expect(
      new URL(
        String(fetchMock.mock.calls[1][0]),
        'http://localhost',
      ).searchParams.get('page'),
    ).toBe('2');

    await act(async () => observers[0].intersect());
    expect(titles()).toEqual(['Film 1', 'Film 2', 'Film 3', 'Film 4']);
    expect(container.textContent).toContain(
      'Tous les films disponibles ont été affichés.',
    );
    expect(container.querySelector('.load-more-button')).toBeNull();
    await act(async () => observers[0].intersect());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('allows only one next-page request at a time and preserves the grid while loading', async () => {
    const pending = deferredResponse();
    fetchMock
      .mockResolvedValueOnce(pageResponse(1, [1]))
      .mockReturnValueOnce(pending.promise);
    await render();
    await act(async () => {
      observers[0].intersect();
      observers[0].intersect();
      observers[0].intersect();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(titles()).toEqual(['Film 1']);
    expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(container.textContent).toContain('Chargement des films...');
    await act(async () => pending.resolve(pageResponse(2, [2])));
    expect(titles()).toEqual(['Film 1', 'Film 2']);
    expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(observers[0].observe).toHaveBeenCalledTimes(2);
  });

  it('keeps URL language, region and starting page for subsequent requests', async () => {
    fetchMock
      .mockResolvedValueOnce(pageResponse(4, [1], 5))
      .mockResolvedValueOnce(pageResponse(5, [2], 5));
    await render('?language=en-US&region=US&page=4');
    await act(async () => observers[0].intersect());
    const queries = fetchMock.mock.calls.map(([url]) =>
      Object.fromEntries(new URL(String(url), 'http://localhost').searchParams),
    );
    expect(queries).toEqual([
      { language: 'en-US', region: 'US', page: '4' },
      { language: 'en-US', region: 'US', page: '5' },
    ]);
  });

  it.each(['0', '-1', '1.5', 'abc', '501'])(
    'uses the default page for invalid page=%s',
    async (page) => {
      fetchMock.mockResolvedValueOnce(pageResponse(1, [1], 1));
      await render(`?page=${page}`);
      const query = new URL(
        String(fetchMock.mock.calls[0][0]),
        'http://localhost',
      ).searchParams;
      expect(Object.fromEntries(query)).toEqual({
        language: 'fr-FR',
        region: 'FR',
        page: '1',
      });
    },
  );

  it.each(['http', 'network'])(
    'preserves movies on a %s error and retries the failed page only on demand',
    async (kind) => {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockResolvedValueOnce(pageResponse(1, [1]));
      if (kind === 'http') {
        fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
      } else {
        fetchMock.mockRejectedValueOnce(new Error('Offline'));
      }
      fetchMock.mockResolvedValueOnce(pageResponse(2, [2], 2));
      await render();
      await act(async () => observers[0].intersect());
      expect(titles()).toEqual(['Film 1']);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'Impossible de charger les films',
      );
      expect(container.querySelector('button')?.textContent).toBe('Réessayer');
      expect(errorLog).toHaveBeenCalledOnce();
      await act(async () => observers[0].intersect());
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await clickLoadMore();
      expect(titles()).toEqual(['Film 1', 'Film 2']);
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(
        fetchMock.mock.calls
          .slice(1)
          .map(([url]) =>
            new URL(String(url), 'http://localhost').searchParams.get('page'),
          ),
      ).toEqual(['2', '2']);
    },
  );

  it('allows retrying an initial failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(pageResponse(1, [1], 1));
    await render();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await clickLoadMore();
    expect(titles()).toEqual(['Film 1']);
  });

  it('stops on an empty page', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse(1, []));
    await render();
    expect(container.textContent).toContain('Aucun film disponible.');
    await act(async () => observers[0].intersect());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('stops at the TMDB page limit even if the API reports more pages', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse(500, [1], 800));
    await render('?page=500');
    await act(async () => observers[0].intersect());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(container.querySelector('.load-more-button')).toBeNull();
  });

  it('supports manual pagination without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    fetchMock
      .mockResolvedValueOnce(pageResponse(1, [1]))
      .mockResolvedValueOnce(pageResponse(2, [2], 2));
    await render();
    await clickLoadMore();
    expect(titles()).toEqual(['Film 1', 'Film 2']);
  });

  it('aborts old requests and ignores stale results when URL criteria change', async () => {
    const pending = deferredResponse();
    fetchMock
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(pageResponse(1, [2], 1));
    await render();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    await act(async () => {
      await router.navigate('/movies?language=en-US');
    });
    expect(signal?.aborted).toBe(true);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(titles()).toEqual(['Film 2']);
    await act(async () => pending.resolve(pageResponse(1, [1])));
    expect(titles()).toEqual(['Film 2']);
  });

  it('aborts in-flight requests and disconnects the observer on unmount', async () => {
    const pending = deferredResponse();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockReturnValueOnce(pending.promise);
    await render();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    observers[0].disconnect.mockClear();
    await act(async () => root.unmount());
    expect(signal?.aborted).toBe(true);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    await act(async () => pending.resolve(pageResponse(1, [1])));
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('ignores the cancelled first effect in StrictMode', async () => {
    const pending = deferredResponse();
    fetchMock
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(pageResponse(1, [2], 1));
    await render('', true);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(titles()).toEqual(['Film 2']);
    await act(async () => pending.resolve(pageResponse(1, [1])));
    expect(titles()).toEqual(['Film 2']);
  });

  it('shows an error instead of accepting invalid pagination metadata', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(pageResponse(2, [1]));
    await render();
    expect(titles()).toEqual([]);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
