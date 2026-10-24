import express from 'express';
import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('./collectMovies', () => ({ collectMovies: vi.fn() }));
vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));
vi.mock('./movies-database', () => ({
  getCollectionSummary: vi.fn(),
  getGenreDistribution: vi.fn(),
  getGenreRatings: vi.fn(),
  getMovieYearDistribution: vi.fn(),
  getMovieRuntimeDistribution: vi.fn(),
}));

import { collectMovies } from './collectMovies';
import { registerCollectionApi } from './collection-api';
import { registerMoviesApi } from './movies-api';
import {
  getCollectionSummary,
  getGenreDistribution,
  getMovieYearDistribution,
  getMovieRuntimeDistribution,
} from './movies-database';

const app = express();
const post = vi.spyOn(app, 'post');
const get = vi.spyOn(app, 'get');
registerCollectionApi(app);
const summaryHandler = get.mock.calls.find(
  ([path]) => path === '/api/movies/collection',
)?.[1] as (req: Request, res: Response) => void;
const yearDistributionHandler = get.mock.calls.find(
  ([path]) => path === '/api/movies/years/distribution',
)?.[1] as (req: Request, res: Response) => void;
const runtimeDistributionHandler = get.mock.calls.find(
  ([path]) => path === '/api/movies/runtimes/distribution',
)?.[1] as (req: Request, res: Response) => void;
const handler = post.mock.calls[0][1] as (
  req: Request,
  res: Response,
) => Promise<void>;

beforeEach(() => vi.clearAllMocks());

it('serves runtime distribution over HTTP alongside movie routes', async () => {
  const serverApp = express();
  registerCollectionApi(serverApp);
  registerMoviesApi(serverApp);
  const data = {
    buckets: [{ label: 'Moins de 1 h', movieCount: 5 }],
    unknownMovieCount: 2,
  };
  vi.mocked(getMovieRuntimeDistribution).mockReturnValue(data);
  const server = serverApp.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Expected a TCP address');
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/movies/runtimes/distribution`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('reports and logs runtime distribution errors', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vi.mocked(getMovieRuntimeDistribution).mockImplementation(() => {
      throw new Error('Read failed');
    });
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    runtimeDistributionHandler(
      {} as Request,
      { status } as unknown as Response,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'Impossible de lire la répartition par durée.',
    });
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it('serves year distribution over HTTP before the movie detail route', async () => {
  const serverApp = express();
  registerCollectionApi(serverApp);
  registerMoviesApi(serverApp);
  const rows = [{ year: 2020, movieCount: 5 }];
  vi.mocked(getMovieYearDistribution).mockReturnValue(rows);
  const server = serverApp.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Expected a TCP address');
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/movies/years/distribution`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(rows);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('reports and logs year distribution read errors', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vi.mocked(getMovieYearDistribution).mockImplementation(() => {
      throw new Error('Read failed');
    });
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    yearDistributionHandler({} as Request, { status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'Impossible de lire la répartition par année de sortie.',
    });
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it('returns genre counts from SQLite', () => {
  vi.mocked(getGenreDistribution).mockReturnValue([
    { id: 18, name: 'Drame', movieCount: 5 },
  ]);
  const serverApp = express();
  const register = vi.spyOn(serverApp, 'get');
  registerCollectionApi(serverApp);
  const route = register.mock.calls.find(
    ([path]) => path === '/api/movies/genres/distribution',
  )?.[1] as (req: Request, res: Response) => void;
  const json = vi.fn();
  route({} as Request, { json } as unknown as Response);
  expect(json).toHaveBeenCalledWith([{ id: 18, name: 'Drame', movieCount: 5 }]);
});

it('serves the summary over HTTP instead of matching the movie detail route', async () => {
  const serverApp = express();
  registerCollectionApi(serverApp);
  registerMoviesApi(serverApp);
  vi.mocked(getCollectionSummary).mockReturnValue({
    movieCount: 100,
    years: [2020],
  });
  const server = serverApp.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/movies/collection`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ movieCount: 100, years: [2020] });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('returns the persisted movie count and collected years', () => {
  vi.mocked(getCollectionSummary).mockReturnValue({
    movieCount: 200,
    years: [2020, 2021],
  });
  const json = vi.fn();
  summaryHandler({} as Request, { json } as unknown as Response);
  expect(json).toHaveBeenCalledWith({ movieCount: 200, years: [2020, 2021] });
});

it('reports summary read errors rather than returning an empty database', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vi.mocked(getCollectionSummary).mockImplementation(() => {
      throw new Error('Read failed');
    });
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    summaryHandler({} as Request, { status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(500);
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

async function request(year: Request['query']['year']) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  await handler(
    { query: { year } } as unknown as Request,
    { json, status } as unknown as Response,
  );
  return { json, status };
}

it('collects a year using the default limit without exposing the database path', async () => {
  vi.mocked(collectMovies).mockResolvedValue({
    year: 2020,
    collected: 100,
    databasePath: '/private/movies.sqlite',
  });
  const response = await request('2020');
  expect(collectMovies).toHaveBeenCalledWith(2020);
  expect(response.json).toHaveBeenCalledWith({ year: 2020, collected: 100 });
});

it.each([undefined, 'invalid', ['2020', '2021'], '1869'])(
  'rejects invalid year %s',
  async (year) => {
    const response = await request(year);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(collectMovies).not.toHaveBeenCalled();
  },
);

it('reports and logs collection errors', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vi.mocked(collectMovies).mockRejectedValue(new Error('Network error'));
    const response = await request('2020');
    expect(response.status).toHaveBeenCalledWith(500);
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
