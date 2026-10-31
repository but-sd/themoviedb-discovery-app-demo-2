import type { DatabaseSync } from 'node:sqlite';
import type { MovieDetails } from '../schemas/MoviesTypes.ts';
import { upsertCountries } from './country-repository.ts';
import { upsertGenres } from './genre-repository.ts';

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
  movie: MovieDetails,
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
    upsertGenres(database, movie.genres);
    upsertCountries(
      database,
      movie.production_countries.map((country) => ({
        code: country.iso_3166_1,
        name: country.name,
      })),
    );
    database
      .prepare('DELETE FROM movie_genres WHERE movie_id = ?')
      .run(movie.id);
    database
      .prepare('DELETE FROM production_countries WHERE movie_id = ?')
      .run(movie.id);
    const insertGenre = database.prepare(
      'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?) ON CONFLICT(movie_id, genre_id) DO NOTHING',
    );
    for (const genre of movie.genres) {
      insertGenre.run(movie.id, genre.id);
    }
    const insertCountry = database.prepare(
      'INSERT INTO production_countries (movie_id, country_code) VALUES (?, ?) ON CONFLICT(movie_id, country_code) DO NOTHING',
    );
    for (const country of movie.production_countries) {
      insertCountry.run(movie.id, country.iso_3166_1);
    }
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}
