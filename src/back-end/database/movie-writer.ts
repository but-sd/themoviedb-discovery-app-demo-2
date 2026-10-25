import type { DatabaseSync } from 'node:sqlite';
import type { Movie, MovieCollectionDetails } from '../schemas/MoviesTypes';

/**
 * Upserts movies, their genres, and collection details into the database.
 * @param database The SQLite database to upsert movies into.
 * @param movies An iterable of movies to upsert.
 * @param details A map of movie IDs to their collection details.
 */
export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  details: ReadonlyMap<number, MovieCollectionDetails> = new Map(),
): void {
  // Prepare the SQL statement for inserting or updating movies in the database.
  const insert = database.prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        popularity, vote_average, vote_count, poster_path,
        backdrop_path, runtime_minutes, budget, revenue, collected_at
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
        runtime_minutes = CASE WHEN ? THEN excluded.runtime_minutes ELSE movies.runtime_minutes END,
        budget = CASE WHEN ? THEN excluded.budget ELSE movies.budget END,
        revenue = CASE WHEN ? THEN excluded.revenue ELSE movies.revenue END,
        collected_at = excluded.collected_at
    `);
  database.exec('SAVEPOINT movie_write');
  try {
    const deleteGenreLinks = database.prepare(
      'DELETE FROM movie_genres WHERE movie_id = ?',
    );
    const insertGenreLink = database.prepare(
      'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
    );
    const deleteProductionCountries = database.prepare(
      'DELETE FROM production_countries WHERE movie_id = ?',
    );
    const insertProductionCountry = database.prepare(
      'INSERT OR IGNORE INTO production_countries (movie_id, country_code) VALUES (?, ?)',
    );
    const collectedAt = new Date().toISOString();
    for (const movie of movies) {
      insert.run(
        movie.id,
        movie.title,
        movie.original_title,
        movie.original_language,
        movie.overview,
        movie.release_date ?? null,
        movie.popularity ?? null,
        movie.vote_average ?? null,
        movie.vote_count ?? null,
        movie.poster_path,
        movie.backdrop_path,
        details.get(movie.id)?.runtime ?? null,
        details.get(movie.id)?.budget ?? null,
        details.get(movie.id)?.revenue ?? null,
        collectedAt,
        Number(details.has(movie.id)),
        Number(details.has(movie.id)),
        Number(details.has(movie.id)),
      );
      deleteGenreLinks.run(movie.id);
      for (const genreId of movie.genre_ids) {
        insertGenreLink.run(movie.id, genreId);
      }
      if (details.has(movie.id)) {
        deleteProductionCountries.run(movie.id);
        for (const country of details.get(movie.id)?.productionCountries ??
          []) {
          insertProductionCountry.run(movie.id, country.code);
        }
      }
    }
    database.exec('RELEASE SAVEPOINT movie_write');
  } catch (error) {
    database.exec('ROLLBACK TO SAVEPOINT movie_write');
    database.exec('RELEASE SAVEPOINT movie_write');
    throw error;
  }
}
