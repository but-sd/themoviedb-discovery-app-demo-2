import type { DatabaseSync } from 'node:sqlite';
import type {
  Genre,
  Movie,
  MovieCollectionDetails,
} from '../schemas/MoviesTypes';

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  year: number,
  genres: Iterable<Genre> = [],
  details: ReadonlyMap<number, MovieCollectionDetails> = new Map(),
): void {
  const insert = database.prepare(`
      INSERT INTO movies (
        id, title, original_title, original_language, overview, release_date,
        release_year, popularity, vote_average, vote_count, poster_path,
        backdrop_path, runtime_minutes, budget, revenue, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        original_title = excluded.original_title,
        original_language = excluded.original_language,
        overview = excluded.overview,
        release_date = excluded.release_date,
        release_year = excluded.release_year,
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
  database.exec('BEGIN');
  try {
    const upsertGenre = database.prepare(`
      INSERT INTO genres (id, name) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `);
    for (const genre of genres) {
      upsertGenre.run(genre.id, genre.name);
    }
    const ensureGenre = database.prepare(
      'INSERT OR IGNORE INTO genres (id) VALUES (?)',
    );
    const deleteLinks = database.prepare(
      'DELETE FROM movie_genres WHERE movie_id = ?',
    );
    const insertLink = database.prepare(
      'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
    );
    const upsertCountry = database.prepare(`
      INSERT INTO countries (code, name) VALUES (?, ?)
      ON CONFLICT(code) DO UPDATE SET name = excluded.name
    `);
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
        movie.release_date,
        year,
        movie.popularity,
        movie.vote_average,
        movie.vote_count,
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
      deleteLinks.run(movie.id);
      for (const genreId of movie.genre_ids) {
        ensureGenre.run(genreId);
        insertLink.run(movie.id, genreId);
      }
      if (details.has(movie.id)) {
        deleteProductionCountries.run(movie.id);
        for (const country of details.get(movie.id)?.productionCountries ??
          []) {
          upsertCountry.run(country.code, country.name);
          insertProductionCountry.run(movie.id, country.code);
        }
      }
    }
    database
      .prepare(`
      INSERT INTO collection_years (year, collected_at) VALUES (?, ?)
      ON CONFLICT(year) DO UPDATE SET collected_at = excluded.collected_at
    `)
      .run(year, collectedAt);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
