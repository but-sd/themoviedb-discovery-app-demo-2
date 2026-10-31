import { parse } from 'csv-parse/sync';
import type { MovieDetails } from './schemas/MoviesTypes.ts';

const columns = [
  'id',
  'title',
  'original_title',
  'original_language',
  'overview',
  'release_date',
  'popularity',
  'vote_average',
  'vote_count',
  'poster_path',
  'backdrop_path',
  'runtime',
  'budget',
  'revenue',
  'genres',
  'production_countries',
] as const;
type Column = (typeof columns)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type CsvMovie = Omit<MovieDetails, 'genres' | 'budget' | 'revenue'> & {
  genres: number[];
  budget: number | null;
  revenue: number | null;
};

export function parseMoviesCsv(csv: string): CsvMovie[] {
  const rows = parse(csv, {
    bom: true,
    columns(headers: string[]) {
      const normalized = headers.map((header) => header.toLowerCase());
      if (
        normalized.length !== columns.length ||
        !columns.every((column) => normalized.includes(column))
      ) {
        throw new Error(
          `CSV must have exactly these columns: ${columns.join(', ')}`,
        );
      }
      return normalized;
    },
    skip_empty_lines: true,
    trim: true,
  }) as Record<Column, string>[];

  return rows.flatMap((row, index) => {
    if (columns.every((column) => row[column] === '')) {
      return [];
    }
    const rowNumber = index + 2;
    function invalid(column: Column): never {
      throw new Error(`CSV row ${rowNumber} has an invalid ${column}`);
    }
    function number(column: Column, integer = false): number {
      const text = row[column];
      if (!/^\d+(?:\.\d+)?$/.test(text)) {
        return invalid(column);
      }
      const value = Number(text);
      if (
        !Number.isFinite(value) ||
        (integer && !Number.isSafeInteger(value))
      ) {
        return invalid(column);
      }
      return value;
    }
    function optionalPositiveInteger(
      column: 'runtime' | 'budget' | 'revenue',
    ): number | null {
      if (row[column] === '') {
        return null;
      }
      const value = number(column, true);
      return value === 0 ? null : value;
    }
    function json(column: Column): unknown {
      try {
        return JSON.parse(row[column]);
      } catch (error) {
        throw new Error(`CSV row ${rowNumber} has invalid JSON in ${column}`, {
          cause: error,
        });
      }
    }
    const id = number('id', true);
    if (id <= 0) {
      invalid('id');
    }
    for (const column of ['title', 'original_title'] as const) {
      if (!row[column]) {
        invalid(column);
      }
    }
    if (!/^[a-z]{2}$/.test(row.original_language)) {
      invalid('original_language');
    }
    if (row.release_date) {
      const date = new Date(`${row.release_date}T00:00:00.000Z`);
      if (
        !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(row.release_date) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== row.release_date
      ) {
        invalid('release_date');
      }
    }
    const genres = json('genres');
    if (!Array.isArray(genres)) {
      invalid('genres');
    }
    const parsedGenres = genres.map((genre: unknown) => {
      if (
        typeof genre !== 'number' ||
        !Number.isSafeInteger(genre) ||
        genre <= 0
      ) {
        return invalid('genres');
      }
      return genre;
    });
    const countries = json('production_countries');
    if (!Array.isArray(countries)) {
      invalid('production_countries');
    }
    const parsedCountries = countries.map((country: unknown) => {
      if (
        !isRecord(country) ||
        typeof country.iso_3166_1 !== 'string' ||
        !/^[A-Z]{2}$/.test(country.iso_3166_1) ||
        typeof country.name !== 'string' ||
        !country.name.trim()
      ) {
        return invalid('production_countries');
      }
      return { iso_3166_1: country.iso_3166_1, name: country.name.trim() };
    });
    const voteAverage = number('vote_average');
    if (voteAverage > 10) {
      invalid('vote_average');
    }
    return [
      {
        id,
        title: row.title,
        original_title: row.original_title,
        original_language: row.original_language,
        overview: row.overview,
        release_date: row.release_date,
        popularity: number('popularity'),
        vote_average: voteAverage,
        vote_count: number('vote_count', true),
        poster_path: row.poster_path || null,
        backdrop_path: row.backdrop_path || null,
        runtime: optionalPositiveInteger('runtime'),
        budget: optionalPositiveInteger('budget'),
        revenue: optionalPositiveInteger('revenue'),
        genres: parsedGenres,
        production_countries: parsedCountries,
        tagline: null,
      },
    ];
  });
}
