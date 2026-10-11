import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_PAGE,
  DEFAULT_REGION,
} from '../../back-end/constants';
import type {
  Movie,
  MoviesApiResponse,
} from '../../back-end/schemas/MoviesTypes';

// TMDB only allows access to the first 500 pages, even if total_pages is higher.
const MAX_PAGE = 500;

type MoviesState = {
  movies: Movie[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
};

const initialState: MoviesState = {
  movies: [],
  isLoading: true,
  hasMore: true,
  error: null,
};

export function useInfiniteMovies(search: string) {
  const params = new URLSearchParams(search);
  const language = params.get('language') || DEFAULT_LANGUAGE;
  const region = params.get('region') || DEFAULT_REGION;
  const requestedPage = Number(params.get('page') || DEFAULT_PAGE);
  const initialPage =
    Number.isInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= MAX_PAGE
      ? requestedPage
      : Number(DEFAULT_PAGE);
  const [state, setState] = useState<MoviesState>(initialState);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let loading = false;
    let hasMore = true;
    let failed = false;
    let nextPage = initialPage;
    let movies: Movie[] = [];
    const sentinel = sentinelRef.current;
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting) && !failed) {
                void loadPage();
              }
            },
            { rootMargin: '300px' },
          );

    async function loadPage() {
      if (disposed || loading || !hasMore) return;
      loading = true;
      failed = false;
      observer?.disconnect();
      setState({ movies, isLoading: true, hasMore, error: null });

      try {
        const query = new URLSearchParams({
          language,
          region,
          page: String(nextPage),
        });
        const response = await fetch(`/api/movies/popular?${query}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Movies API request failed with status ${response.status}`,
          );
        }
        const data: MoviesApiResponse = await response.json();
        if (
          data.page !== nextPage ||
          !Array.isArray(data.results) ||
          !Number.isInteger(data.total_pages) ||
          data.total_pages < 0
        ) {
          throw new Error('Invalid movies API response');
        }
        if (disposed) return;

        const ids = new Set(movies.map((movie) => movie.id));
        movies = [
          ...movies,
          ...data.results.filter((movie) => {
            if (ids.has(movie.id)) return false;
            ids.add(movie.id);
            return true;
          }),
        ];
        hasMore =
          data.results.length > 0 &&
          data.page < Math.min(data.total_pages, MAX_PAGE);
        nextPage = data.page + 1;
        setState({ movies, isLoading: false, hasMore, error: null });
      } catch (error) {
        if (disposed) return;
        console.error('Error fetching popular movies:', error);
        failed = true;
        setState({
          movies,
          isLoading: false,
          hasMore,
          error: 'Impossible de charger les films. Veuillez réessayer.',
        });
      } finally {
        loading = false;
        // Re-observing also loads another page if the viewport is still not filled.
        if (!disposed && !failed && hasMore && sentinel) {
          observer?.observe(sentinel);
        }
      }
    }

    loadMoreRef.current = () => void loadPage();
    void loadPage();

    return () => {
      disposed = true;
      controller.abort();
      observer?.disconnect();
      loadMoreRef.current = null;
    };
  }, [language, region, initialPage]);

  return { ...state, sentinelRef, loadMore: () => loadMoreRef.current?.() };
}
