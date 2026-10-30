import { describe, expect, it } from 'vitest';
import { parseCountriesCsv } from './country-csv';

describe('parseCountriesCsv', () => {
  it('parses country rows with headers in either order', () => {
    expect(
      parseCountriesCsv('code,name\r\nFR,France\r\nUS,United States\r\n'),
    ).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'US', name: 'United States' },
    ]);
    expect(
      parseCountriesCsv('NAME,CODE\n"Congo, Democratic Republic",CD'),
    ).toEqual([{ code: 'CD', name: 'Congo, Democratic Republic' }]);
  });

  it('supports escaped quotes, whitespace and a UTF-8 byte order mark', () => {
    expect(
      parseCountriesCsv('\uFEFFcode,name\n FR ,"France ""Test"""'),
    ).toEqual([{ code: 'FR', name: 'France "Test"' }]);
  });

  it('ignores blank rows and accepts a header-only document', () => {
    expect(parseCountriesCsv('code,name\n\nFR,France\n,')).toEqual([
      { code: 'FR', name: 'France' },
    ]);
    expect(parseCountriesCsv('code,name')).toEqual([]);
  });

  it.each(['id,name', 'code,code', 'code,name,extra'])(
    'rejects invalid headers: %s',
    (headers) => {
      expect(() => parseCountriesCsv(headers)).toThrow(
        'CSV must have exactly two columns: code and name',
      );
    },
  );

  it.each(['', 'fr', 'F', 'FRA', '12'])(
    'rejects invalid country code: %s',
    (code) => {
      expect(() => parseCountriesCsv(`code,name\n${code},France`)).toThrow(
        'CSV row 2 has an invalid country code',
      );
    },
  );

  it('rejects empty names and malformed CSV', () => {
    expect(() => parseCountriesCsv('code,name\nFR,')).toThrow(
      'CSV row 2 has an empty country name',
    );
    expect(() => parseCountriesCsv('code,name\nFR,France,extra')).toThrow();
    expect(() => parseCountriesCsv('code,name\nFR,"France')).toThrow();
    expect(() => parseCountriesCsv('code,name\nFR,"France"x')).toThrow();
  });
});
