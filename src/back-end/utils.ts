import type {
  Movie,
  TmdbMovie,
  TmdbMovieDetails,
  MovieDetails,
} from './schemas/MoviesTypes';

/**
 * Transforms a TmdbMovie object into a supported Movie object by omitting the 'adult' and 'video' properties.
 * @param movieTmdb The raw TmdbMovie object.
 * @returns The supported Movie object.
 */
export const toSupportedMovie = (movieTmdb: TmdbMovie): Movie => {
  return {
    backdrop_path: movieTmdb.backdrop_path,
    genre_ids: movieTmdb.genre_ids ?? [],
    id: movieTmdb.id,
    original_language: movieTmdb.original_language,
    original_title: movieTmdb.original_title,
    overview: movieTmdb.overview,
    popularity: movieTmdb.popularity ?? null,
    poster_path: movieTmdb.poster_path,
    release_date: movieTmdb.release_date ?? null,
    title: movieTmdb.title,
    vote_average: movieTmdb.vote_average ?? null,
    vote_count: movieTmdb.vote_count ?? null,
  };
};

/**
 * Transforms a TmdbMovieDetails object into a supported MovieDetails object by omitting the 'adult' and 'video' properties.
 * @param movie The raw TmdbMovieDetails object.
 * @returns The supported MovieDetails object.
 */
export const toSupportedMovieDetails = (
  movie: TmdbMovieDetails,
): MovieDetails => {
  return {
    backdrop_path: movie.backdrop_path,
    genres: movie.genres,
    id: movie.id,
    original_language: movie.original_language,
    original_title: movie.original_title,
    overview: movie.overview,
    popularity: movie.popularity ?? null,
    poster_path: movie.poster_path,
    production_countries: movie.production_countries,
    release_date: movie.release_date ?? null,
    title: movie.title,
    vote_average: movie.vote_average ?? null,
    vote_count: movie.vote_count ?? null,
    tagline: movie.tagline ?? null,
  };
};
