import express from 'express';
import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('./collectMovies', () => ({ collectMovies: vi.fn() }));
vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));

import { collectMovies } from './collectMovies';
import { registerCollectionApi } from './collection-api';

const app = express();
const post = vi.spyOn(app, 'post');
registerCollectionApi(app);
const handler = post.mock.calls[0][1] as (
  req: Request,
  res: Response,
) => Promise<void>;

beforeEach(() => vi.clearAllMocks());

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
