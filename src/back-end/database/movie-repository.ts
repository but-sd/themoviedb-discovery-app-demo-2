import type { DatabaseSync } from 'node:sqlite';
import type { MovieDetails } from '../schemas/MoviesTypes.ts';

function positiveOrNull(value: number | null): number | null {
  if (value === null || value === 0) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      'Movie runtime, budget and revenue must be non-negative integers or null',
    );
  }
  return value;
}

export function upsertMovie(
  database: DatabaseSync,
  movie: Omit<MovieDetails, 'genres' | 'production_countries' | 'tagline'>,
  collectedAt = new Date().toISOString(),
): void {
  database.exec('BEGIN TRANSACTION;');
  try {
    database
      .prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        popularity, vote_average, vote_count, poster_path, backdrop_path,
        runtime_minutes, budget, revenue, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        original_title = excluded.original_title,
        original_language = excluded.original_language,
        overview = excluded.overview,
        release_date = excluded.release_date,
        popularity = excluded.popularity,
        vote_average = excluded.vote_average,
        vote_count = excluded.vote_count,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        runtime_minutes = excluded.runtime_minutes,
        budget = excluded.budget,
        revenue = excluded.revenue,
        collected_at = excluded.collected_at
    `)
      .run(
        movie.id,
        movie.title,
        movie.original_title,
        movie.original_language,
        movie.overview,
        movie.release_date || null,
        movie.popularity,
        movie.vote_average,
        movie.vote_count,
        movie.poster_path,
        movie.backdrop_path,
        positiveOrNull(movie.runtime),
        positiveOrNull(movie.budget),
        positiveOrNull(movie.revenue),
        collectedAt,
      );
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}
