// TypeScript type for the raw response from the TMDB API for popular movies.
export type TmdbMoviesRawResponse = {
  page: number;
  results: Array<TmdbMovie & { video?: boolean }>;
  total_pages: number;
  total_results: number;
};

// TypeScript type for the raw response from the TMDB API for popular movies.
export type TmdbMovie = {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

export type TmdbMovieDetails = {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  tagline: string | null;
  production_companies: Array<{
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }>;
};

// TypeScript type for the API response when fetching movies, containing an array of supported Movie objects.
export type MoviesApiResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

// TypeScript type for the supported movie format used in our application, omitting 'adult' and 'video' properties from the TmdbMovie type.
export type Movie = Omit<TmdbMovie, 'adult' | 'video'>;

// TypeScript type for the supported movie details format used in our application, omitting 'adult','video' and production_companies properties from the TmdbMovieDetails type.
export type MovieDetails = Omit<
  TmdbMovieDetails,
  'adult' | 'video' | 'production_companies'
>;

// TypeScript type for the API response when fetching popular movies, containing an array of supported Movie objects.
export type ApiErrorResponse = {
  error: string;
};
export type MovieCollectionDetails = {
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  productionCountries: ProductionCountry[];
};

export type ProductionCountry = {
  code: string;
  name: string;
};

export type MovieHighlight = {
  posterPath?: string | null;
  id: number;
  title: string;
  year: number;
  rating: number;
  voteCount: number;
  popularity: number;
};

export type CollectionSummary = {
  movieCount: number;
  years: number[];
  averageRuntime?: number | null;
  runtimeMovieCount?: number;
  averageRating?: number | null;
  ratedMovieCount?: number;
  bestRatedMovie?: MovieHighlight | null;
  mostPopularMovie?: MovieHighlight | null;
  mostProfitableMovie?: FinancialMovieHighlight | null;
  leastProfitableMovie?: FinancialMovieHighlight | null;
};
export type FinancialMovieHighlight = MovieHighlight & {
  budget: number;
  revenue: number;
  returnOnInvestment: number;
};
export type GenreDistribution = {
  id: number;
  name: string;
  movieCount: number;
};
export type GenreRating = GenreDistribution & {
  averageRating: number;
  weightedAverageRating: number;
  voteCount: number;
};
