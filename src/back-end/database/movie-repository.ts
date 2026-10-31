import type { DatabaseSync } from 'node:sqlite';
import type { MovieDetails } from '../schemas/MoviesTypes.ts';

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<
    Omit<
      MovieDetails,
      'genres' | 'production_countries' | 'tagline' | 'budget' | 'revenue'
    > & {
      budget: number | null;
      revenue: number | null;
    }
  >,
  collectedAt = new Date().toISOString(),
): void {
  database.exec('SAVEPOINT movies_upsert;');
  try {
    const insert = database.prepare(`
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
      `);
    for (const movie of movies) {
      insert.run(
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
        movie.runtime,
        movie.budget,
        movie.revenue,
        collectedAt,
      );
    }
    database.exec('RELEASE SAVEPOINT movies_upsert;');
  } catch (error) {
    database.exec(
      'ROLLBACK TO SAVEPOINT movies_upsert; RELEASE SAVEPOINT movies_upsert;',
    );
    throw error;
  }
}
