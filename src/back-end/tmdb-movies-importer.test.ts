import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDatabase } from './database/schema.ts';
import { saveMovieDetails } from './movie-persistence-service.ts';
import { importTmdbMovies } from './tmdb-movies-importer.ts';
import type { MovieDetails } from './schemas/MoviesTypes.ts';

vi.mock('./config.ts', () => ({ tmdbAccessToken: 'test-access-token' }));

const movie: MovieDetails = {
  id: 1,
  title: 'Example',
  original_title: 'Example',
  original_language: 'en',
  overview: 'Overview',
  release_date: '2020-01-01',
  popularity: 10,
  vote_average: 7,
  vote_count: 100,
  poster_path: null,
  backdrop_path: null,
  runtime: 120,
  budget: 1000,
  revenue: 2000,
  tagline: null,
  genres: [{ id: 28, name: 'Action' }],
  production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
};

describe('TMDB movies importer', () => {
  let database: DatabaseSync;
  const fetchMock = vi.fn<typeof fetch>();
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    database = getDatabase(':memory:');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    log = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    database.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function page(ids: number[], pageNumber = 1, totalPages = 1) {
    return new Response(
      JSON.stringify({
        page: pageNumber,
        total_pages: totalPages,
        total_results: ids.length,
        results: ids.map((id) => ({ ...movie, id, genre_ids: [28] })),
      }),
    );
  }
  function detail(id: number, changes: Partial<MovieDetails> = {}) {
    return new Response(JSON.stringify({ ...movie, id, ...changes }));
  }

  it('imports all pages by year and creates missing reference data and associations', async () => {
    fetchMock
      .mockResolvedValueOnce(page([1], 1, 2))
      .mockResolvedValueOnce(detail(1))
      .mockResolvedValueOnce(page([2], 2, 2))
      .mockResolvedValueOnce(detail(2));
    expect(
      await importTmdbMovies(database, 2020, {
        language: 'en-US',
        region: 'US',
      }),
    ).toEqual({ imported: 2, failures: [] });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.themoviedb.org/3/discover/movie?primary_release_year=2020&language=en-US&page=1&region=US',
    );
    expect(database.prepare('SELECT * FROM genres').all()).toEqual(
      movie.genres,
    );
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([
      { code: 'US', name: 'United States' },
    ]);
    expect(
      database.prepare('SELECT * FROM movie_genres ORDER BY movie_id').all(),
    ).toEqual([
      { movie_id: 1, genre_id: 28 },
      { movie_id: 2, genre_id: 28 },
    ]);
    expect(
      database
        .prepare('SELECT * FROM production_countries ORDER BY movie_id')
        .all(),
    ).toEqual([
      { movie_id: 1, country_code: 'US' },
      { movie_id: 2, country_code: 'US' },
    ]);
    expect(database.isTransaction).toBe(false);
  });

  it('preserves existing genre and country names and safely reimports movies', async () => {
    database.exec(
      "INSERT INTO genres VALUES (28, 'Existing action'); INSERT INTO countries VALUES ('US', 'Existing country');",
    );
    for (let attempt = 0; attempt < 2; attempt++) {
      fetchMock
        .mockResolvedValueOnce(page([1]))
        .mockResolvedValueOnce(detail(1));
      expect(await importTmdbMovies(database, '2020')).toEqual({
        imported: 1,
        failures: [],
      });
    }
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM movies').get(),
    ).toEqual({ count: 1 });
    expect(database.prepare('SELECT * FROM genres').all()).toEqual([
      { id: 28, name: 'Existing action' },
    ]);
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([
      { code: 'US', name: 'Existing country' },
    ]);
  });

  it('rolls back a failed movie and its new references, then imports the next movie', async () => {
    saveMovieDetails(database, { ...movie, id: 2 }, 'original');
    database.exec(`CREATE TRIGGER reject_country BEFORE INSERT ON production_countries
      WHEN NEW.movie_id = 2 BEGIN SELECT RAISE(ABORT, 'Bad association'); END;`);
    fetchMock
      .mockResolvedValueOnce(page([1, 2, 3]))
      .mockResolvedValueOnce(detail(1))
      .mockResolvedValueOnce(
        detail(2, {
          title: 'Rejected',
          genres: [{ id: 35, name: 'Comedy' }],
          production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
        }),
      )
      .mockResolvedValueOnce(detail(3));
    const result = await importTmdbMovies(database, 2020);
    expect(result.imported).toBe(2);
    expect(result.failures).toEqual([
      { movieId: 2, page: 1, error: expect.any(Error) },
    ]);
    expect(result.failures[0].error.cause).toBeInstanceOf(Error);
    expect(log).toHaveBeenCalledOnce();
    expect(database.prepare('SELECT id FROM movies ORDER BY id').all()).toEqual(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
    );
    expect(
      database
        .prepare('SELECT title, collected_at FROM movies WHERE id = 2')
        .get(),
    ).toEqual({ title: 'Example', collected_at: 'original' });
    expect(database.prepare('SELECT * FROM genres').all()).toEqual(
      movie.genres,
    );
    expect(database.prepare('SELECT * FROM countries').all()).toEqual([
      { code: 'US', name: 'United States' },
    ]);
    expect(
      database.prepare('SELECT * FROM movie_genres WHERE movie_id = 2').all(),
    ).toEqual([{ movie_id: 2, genre_id: 28 }]);
    expect(
      database
        .prepare('SELECT * FROM production_countries WHERE movie_id = 2')
        .all(),
    ).toEqual([{ movie_id: 2, country_code: 'US' }]);
  });

  it.each([
    { title: '' },
    { id: 999 },
    { release_date: '2020-02-30' },
    { budget: -1 },
    { vote_count: 1.5 },
    { genres: [{ id: 0, name: 'Bad' }] },
    { production_countries: [{ iso_3166_1: 'bad', name: 'Bad' }] },
  ])('reports invalid movie details %j and continues', async (changes) => {
    fetchMock
      .mockResolvedValueOnce(page([1, 2]))
      .mockResolvedValueOnce(detail(1, changes))
      .mockResolvedValueOnce(detail(2));
    const result = await importTmdbMovies(database, 2020);
    expect(result.imported).toBe(1);
    expect(result.failures.map((failure) => failure.movieId)).toEqual([1]);
    expect(database.prepare('SELECT id FROM movies').all()).toEqual([
      { id: 2 },
    ]);
  });

  it('reports detail HTTP failures and attempts duplicate failed IDs only once', async () => {
    fetchMock
      .mockResolvedValueOnce(page([1, 1, 2]))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(detail(2));
    const result = await importTmdbMovies(database, 2020);
    expect(result.imported).toBe(1);
    expect(result.failures.map((failure) => failure.movieId)).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects discovery failures rather than returning a success-shaped result', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(importTmdbMovies(database, 2020)).rejects.toThrow(
      'TMDB API request failed',
    );
  });

  it('rejects invalid years before any network call', async () => {
    await expect(importTmdbMovies(database, 99)).rejects.toThrow(
      'four-digit year',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
