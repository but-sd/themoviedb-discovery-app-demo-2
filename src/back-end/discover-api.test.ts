import type { Request } from 'express';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerDiscoverApi } from './discover-api';
import type { TmdbMovie } from './schemas/MoviesTypes';
import { toSupportedMovie } from './utils';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('express', () => ({
  default: vi.fn(() => ({ get: getMock })),
}));

vi.mock('./config', () => ({
  tmdbAccessToken: 'test-access-token',
}));

const movie: TmdbMovie = {
  adult: false,
  backdrop_path: null,
  genre_ids: [28],
  id: 1,
  original_language: 'en',
  original_title: 'Example',
  overview: 'An example movie',
  popularity: 10,
  poster_path: null,
  release_date: '2020-06-01',
  title: 'Example',
  video: false,
  vote_average: 7,
  vote_count: 100,
};

describe('discover API', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = vi.fn();
  const status = vi.fn();
  let handler: (
    req: Pick<Request, 'query'>,
    res: { json: typeof json; status: typeof status },
  ) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    status.mockReturnValue({ json });
    const app = express();
    registerDiscoverApi(app);
    handler = getMock.mock.calls[0][1] as typeof handler;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function request(query: Request['query']) {
    await handler({ query }, { json, status });
  }

  it('fetches a page of movies for the requested year with default options', async () => {
    fetchMock.mockResolvedValue(
      new globalThis.Response(
        JSON.stringify({
          page: 1,
          results: [movie],
          total_pages: 3,
          total_results: 45,
        }),
      ),
    );

    await request({ year: '2020' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/discover/movie?primary_release_year=2020&language=fr-FR&page=1&region=FR',
      {
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json;charset=utf-8',
        },
      },
    );
    expect(json).toHaveBeenCalledWith({
      page: 1,
      results: [toSupportedMovie(movie)],
      total_pages: 3,
      total_results: 45,
    });
    expect(json.mock.calls[0][0].results[0]).not.toHaveProperty('adult');
    expect(json.mock.calls[0][0].results[0]).not.toHaveProperty('video');
  });

  it('forwards language, page and region and supports an empty result', async () => {
    const data = {
      page: 2,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
    fetchMock.mockResolvedValue(new globalThis.Response(JSON.stringify(data)));

    await request({
      year: '1999',
      language: 'en-US',
      page: '2',
      region: 'US',
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.themoviedb.org/3/discover/movie?primary_release_year=1999&language=en-US&page=2&region=US',
    );
    expect(json).toHaveBeenCalledWith(data);
  });

  it.each([
    undefined,
    '',
    '20',
    '0000',
    '0999',
    '10000',
    '2020.5',
    '2020abc',
    ['2020', '2021'],
    { value: '2020' },
  ])('rejects an invalid year: %j', async (year) => {
    await request({ year });

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'year must be a four-digit year between 1000 and 9999',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['http', 'network', 'json'])(
    'reports a TMDB %s failure',
    async (failure) => {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      if (failure === 'network') {
        fetchMock.mockRejectedValue(new Error('Network failure'));
      } else {
        fetchMock.mockResolvedValue(
          new globalThis.Response('invalid json', {
            status: failure === 'http' ? 503 : 200,
          }),
        );
      }

      await request({ year: '2020' });

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Failed to discover movies',
      });
      expect(errorLog).toHaveBeenCalledWith(
        'Error discovering movies for year 2020:',
        expect.any(Error),
      );
    },
  );
});
