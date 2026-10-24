import type {
  FinancialMovieHighlight,
  GenreRating,
  MovieDetails,
} from '../../back-end/schemas/MoviesTypes';

export const movieHighlight: FinancialMovieHighlight = {
  id: 1,
  title: 'Voyage au-delà des étoiles',
  year: 2026,
  rating: 8.256,
  voteCount: 1500,
  popularity: 123.45,
  posterPath: 'https://image.tmdb.org/t/p/w185/6OEtkkzoyusZDm2uMJojlWZSLR9.jpg',
  budget: 1000000,
  revenue: 4500000,
  returnOnInvestment: 350,
};

export const genres: GenreRating[] = [
  {
    id: 12,
    name: 'Aventure',
    movieCount: 120,
    averageRating: 8.25,
    weightedAverageRating: 7.5,
    voteCount: 5000,
  },
  {
    id: 18,
    name: 'Drame',
    movieCount: 240,
    averageRating: 7,
    weightedAverageRating: 8,
    voteCount: 10000,
  },
];

export const movieDetails: MovieDetails = {
  id: 1,
  title: movieHighlight.title,
  original_title: 'Journey Beyond the Stars',
  original_language: 'en',
  overview:
    'Une équipe part explorer une planète lointaine et découvre un monde inattendu.',
  popularity: movieHighlight.popularity,
  poster_path:
    'https://image.tmdb.org/t/p/w300/6OEtkkzoyusZDm2uMJojlWZSLR9.jpg',
  backdrop_path: null,
  release_date: '2026-07-01',
  vote_average: movieHighlight.rating,
  vote_count: movieHighlight.voteCount,
  genres: [{ id: 12, name: 'Aventure' }],
  production_countries: [
    { iso_3166_1: 'FR', name: 'France' },
    { iso_3166_1: 'BE', name: 'Belgique' },
  ],
  tagline: 'Un voyage qui change tout.',
};
