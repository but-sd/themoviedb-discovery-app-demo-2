import type { Movie, MovieDetails } from '../../back-end/schemas/MoviesTypes';

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isMovieBase(value: unknown) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'title' in value &&
    typeof value.title === 'string' &&
    'original_title' in value &&
    typeof value.original_title === 'string' &&
    'original_language' in value &&
    typeof value.original_language === 'string' &&
    'overview' in value &&
    typeof value.overview === 'string' &&
    'release_date' in value &&
    isNullableString(value.release_date) &&
    'poster_path' in value &&
    isNullableString(value.poster_path) &&
    'backdrop_path' in value &&
    isNullableString(value.backdrop_path) &&
    'popularity' in value &&
    (value.popularity === null ||
      (typeof value.popularity === 'number' &&
        Number.isFinite(value.popularity))) &&
    'vote_average' in value &&
    (value.vote_average === null ||
      (typeof value.vote_average === 'number' &&
        Number.isFinite(value.vote_average) &&
        value.vote_average >= 0 &&
        value.vote_average <= 10)) &&
    'vote_count' in value &&
    (value.vote_count === null ||
      (typeof value.vote_count === 'number' &&
        Number.isSafeInteger(value.vote_count) &&
        value.vote_count >= 0))
  );
}

function isMovie(value: unknown): value is Movie {
  return (
    isMovieBase(value) &&
    typeof value === 'object' &&
    value !== null &&
    'genre_ids' in value &&
    Array.isArray(value.genre_ids) &&
    value.genre_ids.every(
      (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id),
    )
  );
}

function isMovieDetails(value: unknown): value is MovieDetails {
  return (
    isMovieBase(value) &&
    typeof value === 'object' &&
    value !== null &&
    'tagline' in value &&
    isNullableString(value.tagline) &&
    'genres' in value &&
    Array.isArray(value.genres) &&
    value.genres.every(
      (genre: unknown) =>
        typeof genre === 'object' &&
        genre !== null &&
        'id' in genre &&
        typeof genre.id === 'number' &&
        Number.isSafeInteger(genre.id) &&
        'name' in genre &&
        typeof genre.name === 'string',
    ) &&
    'production_countries' in value &&
    Array.isArray(value.production_countries) &&
    value.production_countries.every(
      (country: unknown) =>
        typeof country === 'object' &&
        country !== null &&
        'iso_3166_1' in country &&
        typeof country.iso_3166_1 === 'string' &&
        'name' in country &&
        typeof country.name === 'string',
    )
  );
}

export async function fetchPopularMovies(
  query: URLSearchParams,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const response = await fetch(`/api/movies/popular?${query}`, { signal });
  if (!response.ok)
    throw new Error('Impossible de charger les films populaires.');
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('results' in data) ||
    !Array.isArray(data.results) ||
    !data.results.every(isMovie)
  ) {
    throw new Error('La liste des films est invalide.');
  }
  return data.results;
}

export async function fetchMovieDetails(
  id: string,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw new Error('Identifiant de film invalide.');
  const response = await fetch(`/api/movies/${id}`, { signal });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Film introuvable.'
        : 'Impossible de charger la fiche du film.',
    );
  }
  const data: unknown = await response.json();
  if (!isMovieDetails(data)) throw new Error('La fiche du film est invalide.');
  return data;
}
