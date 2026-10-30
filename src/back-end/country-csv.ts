import { parse } from 'csv-parse/sync';
import type { Country } from './schemas/MoviesTypes';

export function parseCountriesCsv(csv: string): Country[] {
  const rows = parse(csv, {
    bom: true,
    columns(headers: string[]) {
      const normalizedHeaders = headers.map((header) => header.toLowerCase());
      if (
        normalizedHeaders.length !== 2 ||
        !normalizedHeaders.includes('code') ||
        !normalizedHeaders.includes('name')
      ) {
        throw new Error('CSV must have exactly two columns: code and name');
      }
      return normalizedHeaders;
    },
    skip_empty_lines: true,
    trim: true,
  }) as Record<'code' | 'name', string>[];

  return rows.flatMap((row, index) => {
    if (row.code === '' && row.name === '') {
      return [];
    }

    const rowNumber = index + 2;
    if (!/^[A-Z]{2}$/.test(row.code)) {
      throw new Error(`CSV row ${rowNumber} has an invalid country code`);
    }
    if (!row.name) {
      throw new Error(`CSV row ${rowNumber} has an empty country name`);
    }

    return [{ code: row.code, name: row.name }];
  });
}
