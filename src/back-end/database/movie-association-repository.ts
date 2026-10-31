import type { DatabaseSync } from 'node:sqlite';

export function replaceMovieGenres(
  database: DatabaseSync,
  movieId: number,
  genreIds: Iterable<number>,
): void {
  database.exec('SAVEPOINT movie_genres_replace;');
  try {
    database
      .prepare('DELETE FROM movie_genres WHERE movie_id = ?')
      .run(movieId);
    const insert = database.prepare(`
    INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)
    ON CONFLICT(movie_id, genre_id) DO NOTHING
  `);
    for (const genreId of genreIds) {
      insert.run(movieId, genreId);
    }
    database.exec('RELEASE SAVEPOINT movie_genres_replace;');
  } catch (error) {
    database.exec(
      'ROLLBACK TO SAVEPOINT movie_genres_replace; RELEASE SAVEPOINT movie_genres_replace;',
    );
    throw error;
  }
}

export function replaceMovieCountries(
  database: DatabaseSync,
  movieId: number,
  countryCodes: Iterable<string>,
): void {
  database.exec('SAVEPOINT movie_countries_replace;');
  try {
    database
      .prepare('DELETE FROM production_countries WHERE movie_id = ?')
      .run(movieId);
    const insert = database.prepare(`
    INSERT INTO production_countries (movie_id, country_code) VALUES (?, ?)
    ON CONFLICT(movie_id, country_code) DO NOTHING
  `);
    for (const countryCode of countryCodes) {
      insert.run(movieId, countryCode);
    }
    database.exec('RELEASE SAVEPOINT movie_countries_replace;');
  } catch (error) {
    database.exec(
      'ROLLBACK TO SAVEPOINT movie_countries_replace; RELEASE SAVEPOINT movie_countries_replace;',
    );
    throw error;
  }
}
