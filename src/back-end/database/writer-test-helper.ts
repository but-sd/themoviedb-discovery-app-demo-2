import type { DatabaseSync } from 'node:sqlite';
import type {
  Genre,
  Movie,
  MovieCollectionDetails,
} from '../schemas/MoviesTypes';
import { upsertGenres } from './genre-writer';
import { upsertCountries } from './country-writer';
import { upsertMovies as writeMovies } from './movie-writer';

export function upsertMovies(
  database: DatabaseSync,
  movies: Iterable<Movie>,
  genres: Iterable<Genre> = [],
  details: ReadonlyMap<number, MovieCollectionDetails> = new Map(),
): void {
  const collectedMovies = [...movies];
  database.exec('BEGIN');
  try {
    const namedGenres = new Map<number, Genre>();
    for (const movie of collectedMovies) {
      for (const id of movie.genre_ids) {
        namedGenres.set(id, { id, name: `Test genre ${id}` });
      }
    }
    for (const genre of genres) namedGenres.set(genre.id, genre);
    upsertGenres(database, namedGenres.values());
    upsertCountries(
      database,
      collectedMovies.flatMap(
        (movie) => details.get(movie.id)?.productionCountries ?? [],
      ),
    );
    writeMovies(database, collectedMovies, details);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
