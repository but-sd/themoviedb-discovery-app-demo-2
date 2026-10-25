import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { getCatalogSummary } from './catalog-summary';
import { createMoviesDatabase } from './connection';

it('counts all films and lists only distinct known years in chronological order', () => {
  const directory = mkdtempSync(join(tmpdir(), 'catalog-summary-'));
  const path = join(directory, 'movies.sqlite');
  try {
    expect(getCatalogSummary(path)).toEqual({ movieCount: 0, years: [] });
    const database = createMoviesDatabase(path);
    try {
      const insert = database.prepare(`
        INSERT INTO movies (id, title, original_title, original_language, overview, release_date, collected_at)
        VALUES (?, 'Test', 'Test', 'fr', '', ?, '2026-01-01')
      `);
      insert.run(1, '2024-01-01');
      insert.run(2, '2020-01-01');
      insert.run(3, '2024-06-01');
      insert.run(4, null);
      expect(getCatalogSummary(path)).toEqual({
        movieCount: 4,
        years: [2020, 2024],
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
