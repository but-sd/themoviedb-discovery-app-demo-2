import type { Express, Request, RequestHandler, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import { tmdbAccessToken } from './config';
import { registerMoviesApi } from './movies-api';
import type {
  TmdbMovieDetails,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';

const { toSupportedMovieMock, toSupportedMovieDetailsMock } = vi.hoisted(
  () => ({
    toSupportedMovieMock: vi.fn(),
    toSupportedMovieDetailsMock: vi.fn(),
  }),
);

vi.mock('./utils', () => ({
  toSupportedMovie: toSupportedMovieMock,
  toSupportedMovieDetails: toSupportedMovieDetailsMock,
}));

type RouteHandler = (
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) => void | Promise<void>;

const handlers = new Map<string, RequestHandler>();
const app = {
  get: (path: string, handler: RequestHandler) => handlers.set(path, handler),
} as unknown as Express;

function getHandler(path: string): RouteHandler {
  const handler = handlers.get(path);
  if (!handler) throw new Error(`No handler registered for ${path}`);
  return handler as RouteHandler;
}

function createResponse() {
  const response = { json: vi.fn(), status: vi.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

function tmdbResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe('movies API', () => {
  beforeEach(() => {
    handlers.clear();
    registerMoviesApi(app);
    toSupportedMovieMock.mockReset();
    toSupportedMovieDetailsMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns popular movies with defaults and supplied query parameters', async () => {
    const rawMovie = { id: 1 };
    const rawData = {
      page: 1,
      results: [rawMovie],
      total_pages: 2,
      total_results: 1,
    } as unknown as TmdbMoviesRawResponse;
    const supportedMovie = { id: 1, title: 'Movie' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tmdbResponse(rawData))
      .mockResolvedValueOnce(tmdbResponse({ ...rawData, page: 3 }));
    vi.stubGlobal('fetch', fetchMock);
    toSupportedMovieMock.mockReturnValue(supportedMovie);
    const defaultResponse = createResponse();
    const customResponse = createResponse();

    await getHandler('/api/movies/popular')(
      { query: {} } as Request,
      defaultResponse,
      vi.fn(),
    );
    await getHandler('/api/movies/popular')(
      { query: { language: 'fr-FR', page: '3', region: 'CA' } } as Request,
      customResponse,
      vi.fn(),
    );

    const defaultQuery = new URLSearchParams({
      language: DEFAULT_LANGUAGE,
      page: DEFAULT_PAGE,
      region: DEFAULT_REGION,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://api.themoviedb.org/3/movie/popular?${defaultQuery}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${tmdbAccessToken}`,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.themoviedb.org/3/movie/popular?language=fr-FR&page=3&region=CA',
      expect.any(Object),
    );
    expect(toSupportedMovieMock).toHaveBeenCalledWith(rawMovie, 0, [rawMovie]);
    expect(defaultResponse.json).toHaveBeenCalledWith({
      page: 1,
      results: [supportedMovie],
      total_pages: 2,
      total_results: 1,
    });
    expect(customResponse.json).toHaveBeenCalled();
  });

  it('returns errors for unsuccessful and rejected popular movie requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tmdbResponse({}, false, 503))
      .mockRejectedValueOnce(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);
    const unsuccessfulResponse = createResponse();
    const rejectedResponse = createResponse();

    await getHandler('/api/movies/popular')(
      { query: {} } as Request,
      unsuccessfulResponse,
      vi.fn(),
    );
    await getHandler('/api/movies/popular')(
      { query: {} } as Request,
      rejectedResponse,
      vi.fn(),
    );

    for (const response of [unsuccessfulResponse, rejectedResponse]) {
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Failed to fetch popular movies',
      });
    }
  });

  it('returns movie details with defaults and supplied query parameters', async () => {
    const rawData = { id: 42 } as unknown as TmdbMovieDetails;
    const supportedDetails = { id: 42, title: 'Movie details' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tmdbResponse(rawData))
      .mockResolvedValueOnce(tmdbResponse(rawData));
    vi.stubGlobal('fetch', fetchMock);
    toSupportedMovieDetailsMock.mockReturnValue(supportedDetails);
    const defaultResponse = createResponse();
    const customResponse = createResponse();

    await getHandler('/api/movies/:id')(
      { params: { id: '42' }, query: {} } as unknown as Request,
      defaultResponse,
      vi.fn(),
    );
    await getHandler('/api/movies/:id')(
      {
        params: { id: '7' },
        query: { language: 'fr-FR', page: '3', region: 'CA' },
      } as unknown as Request,
      customResponse,
      vi.fn(),
    );

    const defaultQuery = new URLSearchParams({
      language: DEFAULT_LANGUAGE,
      page: DEFAULT_PAGE,
      region: DEFAULT_REGION,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://api.themoviedb.org/3/movie/42?${defaultQuery}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${tmdbAccessToken}`,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.themoviedb.org/3/movie/7?language=fr-FR&page=3&region=CA',
      expect.any(Object),
    );
    expect(toSupportedMovieDetailsMock).toHaveBeenCalledWith(rawData);
    expect(defaultResponse.json).toHaveBeenCalledWith(supportedDetails);
    expect(customResponse.json).toHaveBeenCalledWith(supportedDetails);
  });

  it('returns errors for unsuccessful and rejected movie detail requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tmdbResponse({}, false, 404))
      .mockRejectedValueOnce(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);
    const unsuccessfulResponse = createResponse();
    const rejectedResponse = createResponse();

    await getHandler('/api/movies/:id')(
      { params: { id: '42' }, query: {} } as unknown as Request,
      unsuccessfulResponse,
      vi.fn(),
    );
    await getHandler('/api/movies/:id')(
      { params: { id: '42' }, query: {} } as unknown as Request,
      rejectedResponse,
      vi.fn(),
    );

    for (const response of [unsuccessfulResponse, rejectedResponse]) {
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Failed to fetch movie with ID 42',
      });
    }
  });
});
