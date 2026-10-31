import express from 'express';
import type { Request } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMoviesApi } from './movies-api.ts';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('express', () => ({ default: vi.fn(() => ({ get: getMock })) }));
vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));

describe('movie detail API', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = vi.fn();
  const status = vi.fn();
  let handler: (
    req: Pick<Request, 'params' | 'query'>,
    res: { json: typeof json; status: typeof status },
  ) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    status.mockReturnValue({ json });
    registerMoviesApi(express());
    handler = getMock.mock.calls.find(
      ([path]) => path === '/api/movies/:id',
    )![1] as typeof handler;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes enrichment fields and preserves the supported detail format', async () => {
    const detail = {
      id: 1,
      title: 'Example',
      original_title: 'Example',
      original_language: 'en',
      overview: 'Example',
      release_date: '2020-06-01',
      popularity: 10,
      vote_average: 7,
      vote_count: 100,
      poster_path: null,
      backdrop_path: null,
      genres: [{ id: 28, name: 'Action' }],
      tagline: null,
      runtime: 120,
      budget: 1000,
      revenue: 5000,
      production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
    };
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...detail,
          adult: false,
          video: false,
          production_companies: [],
        }),
      ),
    );
    await handler({ params: { id: '1' }, query: {} }, { json, status });
    expect(json).toHaveBeenCalledWith(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/1?language=fr-FR&page=1&region=FR',
      {
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json;charset=utf-8',
        },
      },
    );
  });

  it('forwards custom language, page and region', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })));
    await handler(
      {
        params: { id: '1' },
        query: { language: 'en-US', page: '2', region: 'US' },
      },
      { json, status },
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.themoviedb.org/3/movie/1?language=en-US&page=2&region=US',
    );
  });

  it('keeps the existing error response on a TMDB failure', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    await handler({ params: { id: '1' }, query: {} }, { json, status });
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'Failed to fetch movie with ID 1',
    });
    expect(errorLog).toHaveBeenCalled();
  });
});
