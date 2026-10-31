import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { describe, expect, it } from 'vitest';
import { parseMoviesCsv } from './movie-csv.ts';

const sample = readFileSync('src/back-end/fixtures/movies.csv', 'utf8');
const [header, example] = parse(sample) as string[][];

function csv(overrides: Record<string, string> = {}) {
  const row = example.map((value, index) => overrides[header[index]] ?? value);
  return [header, row]
    .map((cells) =>
      cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','),
    )
    .join('\n');
}

describe('movie CSV parser', () => {
  it('provides exactly the first ten movies from the documented TMDB Discover response', () => {
    const movies = parseMoviesCsv(readFileSync('data/movies.csv', 'utf8'));
    expect(movies.map((movie) => movie.id)).toEqual([
      640146, 502356, 594767, 76600, 948713, 677179, 713704, 638974, 315162,
      603692,
    ]);
    expect(new Set(movies.map((movie) => movie.id)).size).toBe(10);
    for (const movie of movies) {
      expect(
        movie.genres.every((id) => Number.isSafeInteger(id) && id > 0),
      ).toBe(true);
      expect(movie.overview).toBe('');
      expect(movie.runtime).toBeGreaterThan(0);
      expect(movie.production_countries.length).toBeGreaterThan(0);
    }
    expect(
      movies.map(({ id, runtime, budget, revenue }) => ({
        id,
        runtime,
        budget,
        revenue,
      })),
    ).toEqual([
      { id: 640146, runtime: 125, budget: 200000000, revenue: 476071180 },
      { id: 502356, runtime: 93, budget: 100000000, revenue: 1360879735 },
      { id: 594767, runtime: 130, budget: 110000000, revenue: 134221819 },
      { id: 76600, runtime: 192, budget: 460000000, revenue: 2334484620 },
      { id: 948713, runtime: 111, budget: null, revenue: null },
      { id: 677179, runtime: 116, budget: 75000000, revenue: 275300000 },
      { id: 713704, runtime: 96, budget: 15000000, revenue: 147256372 },
      { id: 638974, runtime: 91, budget: null, revenue: null },
      { id: 315162, runtime: 103, budget: 90000000, revenue: 484700000 },
      { id: 603692, runtime: 170, budget: 100000000, revenue: 447316405 },
    ]);
  });

  it('parses the documented example with JSON associations', () => {
    expect(parseMoviesCsv(sample)).toEqual([
      {
        id: 1,
        title: 'Example',
        original_title: 'Example',
        original_language: 'en',
        overview: 'An example movie',
        release_date: '2020-06-01',
        popularity: 10,
        vote_average: 7,
        vote_count: 100,
        poster_path: null,
        backdrop_path: null,
        runtime: 100,
        budget: 1000,
        revenue: 2000,
        genres: [28],
        production_countries: [{ iso_3166_1: 'FR', name: 'France' }],
        tagline: null,
      },
    ]);
  });

  it('supports empty optional fields and empty association lists', () => {
    expect(
      parseMoviesCsv(
        csv({
          overview: '',
          release_date: '',
          runtime: '',
          budget: '',
          revenue: '',
          genres: '[]',
          production_countries: '[]',
        }),
      )[0],
    ).toMatchObject({
      overview: '',
      release_date: '',
      runtime: null,
      budget: null,
      revenue: null,
      genres: [],
      production_countries: [],
    });
  });

  it('maps zero-valued unknown runtime and financial fields to null', () => {
    expect(
      parseMoviesCsv(csv({ runtime: '0', budget: '0', revenue: '0' }))[0],
    ).toMatchObject({ runtime: null, budget: null, revenue: null });
  });

  it('parses multiple genre IDs and retains duplicates for association deduplication', () => {
    expect(parseMoviesCsv(csv({ genres: '[28,35,28]' }))[0].genres).toEqual([
      28, 35, 28,
    ]);
  });

  it('supports BOM, case-insensitive reordered headers and quoted multiline text', () => {
    const rows = parse(csv({ overview: 'Hello,\n"world"' })) as string[][];
    const reordered = rows
      .map((row, index) =>
        [...row]
          .reverse()
          .map(
            (cell) =>
              `"${(index === 0 ? cell.toUpperCase() : cell).replaceAll('"', '""')}"`,
          )
          .join(','),
      )
      .join('\n');
    expect(parseMoviesCsv(`\uFEFF${reordered}`)[0].overview).toBe(
      'Hello,\n"world"',
    );
  });

  it('supports header-only CSV and skips fully empty rows', () => {
    expect(parseMoviesCsv(header.join(','))).toEqual([]);
    expect(
      parseMoviesCsv(
        `${header.join(',')}\n${header.map(() => '').join(',')}\n`,
      ),
    ).toEqual([]);
  });

  it.each([
    ['id', '0'],
    ['id', '1.5'],
    ['id', '9007199254740992'],
    ['title', ''],
    ['original_title', ''],
    ['original_language', 'EN'],
    ['release_date', '2020-02-30'],
    ['release_date', 'not-a-date'],
    ['popularity', '-1'],
    ['popularity', 'Infinity'],
    ['popularity', ''],
    ['vote_average', '11'],
    ['vote_count', '1.5'],
    ['runtime', '-1'],
    ['budget', 'NaN'],
    ['revenue', '1e3'],
    ['genres', '{}'],
    ['genres', '[{"id":0,"name":"Action"}]'],
    ['genres', '[{"id":1,"name":""}]'],
    ['genres', '[null]'],
    ['genres', '[0]'],
    ['genres', '[-1]'],
    ['genres', '[1.5]'],
    ['genres', '["28"]'],
    ['genres', '[9007199254740992]'],
    ['production_countries', '{}'],
    ['production_countries', '[{"iso_3166_1":"fr","name":"France"}]'],
    ['production_countries', '[{"iso_3166_1":"FR","name":""}]'],
  ])('rejects invalid %s value %s with row context', (column, value) => {
    expect(() => parseMoviesCsv(csv({ [column]: value }))).toThrow(
      `CSV row 2 has an invalid ${column}`,
    );
  });

  it.each(['genres', 'production_countries'])(
    'reports malformed JSON in %s',
    (column) => {
      expect(() => parseMoviesCsv(csv({ [column]: '[' }))).toThrow(
        `CSV row 2 has invalid JSON in ${column}`,
      );
    },
  );

  it('rejects missing, extra and duplicate columns', () => {
    for (const invalidHeader of [
      header.slice(1),
      [...header, 'extra'],
      [...header.slice(0, -1), 'genres'],
    ]) {
      expect(() => parseMoviesCsv(invalidHeader.join(','))).toThrow(
        'CSV must have exactly these columns',
      );
    }
  });
});
