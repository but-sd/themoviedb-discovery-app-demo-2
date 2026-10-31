import type { DatabaseSync } from 'node:sqlite';
import {
  getCountryByCode,
  upsertCountries,
} from './database/country-repository.ts';
import { getGenreById, upsertGenres } from './database/genre-repository.ts';
import {
  replaceMovieCountries,
  replaceMovieGenres,
} from './database/movie-association-repository.ts';
import { upsertMovies } from './database/movie-repository.ts';
import type { MovieDetails } from './schemas/MoviesTypes.ts';

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

export function saveMovieDetails(
  database: DatabaseSync,
  movie: MovieDetails,
  collectedAt = new Date().toISOString(),
): void {
  validateMovieDetails(movie);
  const storedMovie = {
    ...movie,
    runtime: positiveOrNull(movie.runtime),
    budget: positiveOrNull(movie.budget),
    revenue: positiveOrNull(movie.revenue),
  };
  const countries = movie.production_countries.map((country) => ({
    code: country.iso_3166_1,
    name: country.name,
  }));

  database.exec('SAVEPOINT movie_persistence;');
  try {
    upsertGenres(
      database,
      movie.genres.filter((genre) => !getGenreById(database, genre.id)),
    );
    upsertCountries(
      database,
      countries.filter((country) => !getCountryByCode(database, country.code)),
    );
    upsertMovies(database, [storedMovie], collectedAt);
    replaceMovieGenres(
      database,
      movie.id,
      movie.genres.map((genre) => genre.id),
    );
    replaceMovieCountries(
      database,
      movie.id,
      countries.map((country) => country.code),
    );
    database.exec('RELEASE SAVEPOINT movie_persistence;');
  } catch (error) {
    database.exec(
      'ROLLBACK TO SAVEPOINT movie_persistence; RELEASE SAVEPOINT movie_persistence;',
    );
    throw error;
  }

  function validateMovieDetails(movie: MovieDetails): void {
    if (!Number.isSafeInteger(movie.id) || movie.id <= 0) {
      throw new Error('Movie ID must be a positive integer');
    }
    for (const field of ['title', 'original_title'] as const) {
      if (typeof movie[field] !== 'string' || !movie[field].trim()) {
        throw new Error(`Movie ${field} must be a non-empty string`);
      }
    }
    if (
      typeof movie.overview !== 'string' ||
      !/^[a-z]{2}$/.test(movie.original_language)
    ) {
      throw new Error('Movie overview or original language is invalid');
    }
    for (const field of ['popularity', 'vote_average', 'vote_count'] as const) {
      if (!Number.isFinite(movie[field]) || movie[field] < 0) {
        throw new Error(`Movie ${field} must be a non-negative finite number`);
      }
    }
    if (movie.vote_average > 10 || !Number.isSafeInteger(movie.vote_count)) {
      throw new Error('Movie vote average or vote count is invalid');
    }
    for (const field of ['poster_path', 'backdrop_path'] as const) {
      if (movie[field] !== null && typeof movie[field] !== 'string') {
        throw new Error(`Movie ${field} must be a string or null`);
      }
    }
    if (typeof movie.release_date !== 'string') {
      throw new Error('Movie release date must be a string');
    }
    if (movie.release_date) {
      const date = new Date(`${movie.release_date}T00:00:00.000Z`);
      if (
        !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(movie.release_date) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== movie.release_date
      ) {
        throw new Error('Movie release date must be a valid YYYY-MM-DD date');
      }
    }
    if (
      !Array.isArray(movie.genres) ||
      movie.genres.some(
        (genre) =>
          !genre ||
          !Number.isSafeInteger(genre.id) ||
          genre.id <= 0 ||
          typeof genre.name !== 'string' ||
          !genre.name.trim(),
      )
    ) {
      throw new Error(
        'Movie genres must contain positive IDs and non-empty names',
      );
    }
    if (
      !Array.isArray(movie.production_countries) ||
      movie.production_countries.some(
        (country) =>
          !country ||
          typeof country.iso_3166_1 !== 'string' ||
          !/^[A-Z]{2}$/.test(country.iso_3166_1) ||
          typeof country.name !== 'string' ||
          !country.name.trim(),
      )
    ) {
      throw new Error(
        'Movie production countries must contain valid ISO codes and non-empty names',
      );
    }
  }
}
