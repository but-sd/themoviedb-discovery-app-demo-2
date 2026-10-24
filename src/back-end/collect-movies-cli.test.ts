import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ tmdbAccessToken: 'test-access-token' }));
vi.mock('./collectMovies', () => ({ collectMovies: vi.fn() }));

import { collectMovies } from './collectMovies';
import { createCollectionCommand } from './collect-movies-cli';

function command() {
  return createCollectionCommand()
    .exitOverride()
    .configureOutput({ writeErr: () => {}, writeOut: () => {} });
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.mocked(collectMovies)
    .mockReset()
    .mockImplementation(async (year) => ({
      year,
      collected: 3,
      databasePath: 'test.sqlite',
    }));
});
afterEach(() => vi.restoreAllMocks());

it('preserves single-year collection and its default limit', async () => {
  await command().parseAsync(['2020'], { from: 'user' });
  expect(collectMovies).toHaveBeenCalledExactlyOnceWith(2020, 100);
});

it('preserves the existing positional count argument', async () => {
  await command().parseAsync(['2020', '50'], { from: 'user' });
  expect(collectMovies).toHaveBeenCalledExactlyOnceWith(2020, 50);
});

it('collects the inclusive range with the limit applied per year', async () => {
  const years: number[] = [];
  vi.mocked(collectMovies).mockImplementation(async (year) => {
    await Promise.resolve();
    years.push(year);
    return { year, collected: 2, databasePath: 'test.sqlite' };
  });
  await command().parseAsync(['2019', '50', '--end-year', '2021'], {
    from: 'user',
  });
  expect(vi.mocked(collectMovies).mock.calls).toEqual([
    [2019, 50],
    [2020, 50],
    [2021, 50],
  ]);
  expect(years).toEqual([2019, 2020, 2021]);
  expect(console.log).toHaveBeenCalledWith(
    'Collection complete: 6 movies across 3 year(s).',
  );
});

it('collects once when both bounds are equal', async () => {
  await command().parseAsync(['2020', '--end-year', '2020'], { from: 'user' });
  expect(collectMovies).toHaveBeenCalledExactlyOnceWith(2020, 100);
});

it.each([
  ['2021', '--end-year', '2020'],
  ['1869'],
  ['2020', '--end-year', '1869'],
  [String(new Date().getFullYear() + 1)],
  ['2020', '--end-year', String(new Date().getFullYear() + 1)],
  ['20'],
  ['2020', '--end-year', 'abc'],
  ['2020', '--end-year'],
  ['2020', '0'],
  ['2020', '-1'],
  ['2020', '1.5'],
  ['2020', '9007199254740992'],
])(
  'rejects invalid arguments %j before collecting any year',
  async (...args) => {
    await expect(
      command().parseAsync(args, { from: 'user' }),
    ).rejects.toThrow();
    expect(collectMovies).not.toHaveBeenCalled();
  },
);

it('stops scheduling new years on failure without reporting success', async () => {
  vi.mocked(collectMovies).mockRejectedValueOnce(new Error('TMDB unavailable'));
  await expect(
    command().parseAsync(['2019', '--end-year', '2023'], { from: 'user' }),
  ).rejects.toThrow(
    'Collection failed for 2019. Previously saved years are preserved. TMDB unavailable',
  );
  expect(vi.mocked(collectMovies).mock.calls).toEqual([
    [2019, 100],
    [2020, 100],
    [2021, 100],
  ]);
  expect(console.log).not.toHaveBeenCalledWith(
    expect.stringContaining('Collection complete'),
  );
});

it('preserves earlier completed years when a later year fails', async () => {
  vi.mocked(collectMovies)
    .mockResolvedValueOnce({
      year: 2019,
      collected: 5,
      databasePath: 'test.sqlite',
    })
    .mockRejectedValueOnce(new Error('TMDB unavailable'));
  await expect(
    command().parseAsync(['2019', '--end-year', '2021'], { from: 'user' }),
  ).rejects.toThrow('Collection failed for 2020');
  expect(vi.mocked(collectMovies).mock.calls).toEqual([
    [2019, 100],
    [2020, 100],
    [2021, 100],
  ]);
});

function pendingCollection() {
  let resolve!: (value: Awaited<ReturnType<typeof collectMovies>>) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Awaited<ReturnType<typeof collectMovies>>>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return { promise, resolve, reject };
}

it('runs at most three years concurrently and fills a slot as soon as it becomes free', async () => {
  const pending = Array.from({ length: 5 }, pendingCollection);
  vi.mocked(collectMovies).mockImplementation(
    (year) => pending[year - 2019].promise,
  );
  const run = command().parseAsync(['2019', '--end-year', '2023'], {
    from: 'user',
  });
  expect(collectMovies).toHaveBeenCalledTimes(3);
  pending[1].resolve({ year: 2020, collected: 2, databasePath: 'test.sqlite' });
  await vi.waitFor(() => expect(collectMovies).toHaveBeenCalledTimes(4));
  expect(collectMovies).toHaveBeenNthCalledWith(4, 2022, 100);
  pending[0].resolve({ year: 2019, collected: 1, databasePath: 'test.sqlite' });
  await vi.waitFor(() => expect(collectMovies).toHaveBeenCalledTimes(5));
  pending[4].resolve({ year: 2023, collected: 5, databasePath: 'test.sqlite' });
  pending[3].resolve({ year: 2022, collected: 4, databasePath: 'test.sqlite' });
  pending[2].resolve({ year: 2021, collected: 3, databasePath: 'test.sqlite' });
  await run;
  expect(console.log).toHaveBeenCalledWith(
    'Collection complete: 15 movies across 5 year(s).',
  );
});

it('waits for in-flight years after a failure and reports every failed year', async () => {
  const pending = Array.from({ length: 3 }, pendingCollection);
  vi.mocked(collectMovies).mockImplementation(
    (year) => pending[year - 2019].promise,
  );
  let settled = false;
  const run = command().parseAsync(['2019', '--end-year', '2023'], {
    from: 'user',
  });
  const outcome = run.then(
    () => {
      settled = true;
      return null;
    },
    (error: unknown) => {
      settled = true;
      return error;
    },
  );
  pending[0].reject(new Error('First failure'));
  await vi.waitFor(() =>
    expect(pending[0].promise).rejects.toThrow('First failure'),
  );
  expect(settled).toBe(false);
  pending[1].resolve({ year: 2020, collected: 2, databasePath: 'test.sqlite' });
  pending[2].reject(new Error('Second failure'));
  const error = await outcome;
  expect(error).toBeInstanceOf(AggregateError);
  expect(error).toHaveProperty(
    'message',
    expect.stringContaining('Collection failed for 2019'),
  );
  expect(error).toHaveProperty(
    'message',
    expect.stringContaining('Collection failed for 2021'),
  );
  expect(collectMovies).toHaveBeenCalledTimes(3);
  expect(console.log).not.toHaveBeenCalledWith(
    expect.stringContaining('Collection complete'),
  );
});
