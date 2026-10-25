import type {
  CollectionSummary,
  FinancialMovieHighlight,
  MovieHighlight,
  ProductionCountryHighlight,
} from '../../back-end/schemas/MoviesTypes';

function isMovieHighlight(value: unknown): value is MovieHighlight | null {
  return (
    value === null ||
    (typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'number' &&
      Number.isSafeInteger(value.id) &&
      'title' in value &&
      typeof value.title === 'string' &&
      'posterPath' in value &&
      (value.posterPath === null || typeof value.posterPath === 'string') &&
      'year' in value &&
      typeof value.year === 'number' &&
      Number.isInteger(value.year) &&
      'rating' in value &&
      (value.rating === null ||
        (typeof value.rating === 'number' &&
          Number.isFinite(value.rating) &&
          value.rating >= 0 &&
          value.rating <= 10)) &&
      'voteCount' in value &&
      (value.voteCount === null ||
        (typeof value.voteCount === 'number' &&
          Number.isSafeInteger(value.voteCount) &&
          value.voteCount >= 0)) &&
      'popularity' in value &&
      (value.popularity === null ||
        (typeof value.popularity === 'number' &&
          Number.isFinite(value.popularity) &&
          value.popularity >= 0)))
  );
}

function isProductionCountryHighlight(
  value: unknown,
): value is ProductionCountryHighlight | null {
  return (
    value === null ||
    (typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof value.code === 'string' &&
      /^[A-Z]{2}$/.test(value.code) &&
      'name' in value &&
      typeof value.name === 'string' &&
      value.name.trim().length > 0 &&
      'movieCount' in value &&
      typeof value.movieCount === 'number' &&
      Number.isSafeInteger(value.movieCount) &&
      value.movieCount > 0)
  );
}

function isFinancialMovieHighlight(
  value: unknown,
): value is FinancialMovieHighlight | null {
  return (
    value === null ||
    (isMovieHighlight(value) &&
      value !== null &&
      'budget' in value &&
      typeof value.budget === 'number' &&
      Number.isSafeInteger(value.budget) &&
      value.budget > 0 &&
      'revenue' in value &&
      typeof value.revenue === 'number' &&
      Number.isSafeInteger(value.revenue) &&
      value.revenue > 0 &&
      'returnOnInvestment' in value &&
      typeof value.returnOnInvestment === 'number' &&
      Number.isFinite(value.returnOnInvestment) &&
      value.returnOnInvestment > -100)
  );
}

export async function fetchCollectionSummary(
  signal?: AbortSignal,
): Promise<CollectionSummary> {
  const response = await fetch('/api/movies/collection', { signal });
  if (!response.ok) {
    throw new Error('Impossible de lire les informations de la base.');
  }
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('movieCount' in data) ||
    typeof data.movieCount !== 'number' ||
    !Number.isSafeInteger(data.movieCount) ||
    data.movieCount < 0 ||
    !('years' in data) ||
    !Array.isArray(data.years) ||
    !data.years.every(
      (year: unknown) => typeof year === 'number' && Number.isInteger(year),
    )
  ) {
    throw new Error('Les informations de la base sont invalides.');
  }
  if (
    !('averageRuntime' in data) ||
    (data.averageRuntime !== null &&
      (typeof data.averageRuntime !== 'number' ||
        !Number.isFinite(data.averageRuntime) ||
        data.averageRuntime <= 0)) ||
    !('runtimeMovieCount' in data) ||
    typeof data.runtimeMovieCount !== 'number' ||
    !Number.isSafeInteger(data.runtimeMovieCount) ||
    data.runtimeMovieCount < 0
  ) {
    throw new Error('Les informations de durée sont invalides.');
  }
  if (
    !('averageRating' in data) ||
    (data.averageRating !== null &&
      (typeof data.averageRating !== 'number' ||
        !Number.isFinite(data.averageRating) ||
        data.averageRating < 0 ||
        data.averageRating > 10)) ||
    !('ratedMovieCount' in data) ||
    typeof data.ratedMovieCount !== 'number' ||
    !Number.isSafeInteger(data.ratedMovieCount) ||
    data.ratedMovieCount < 0
  ) {
    throw new Error('Les informations de notation sont invalides.');
  }
  if (
    !('bestRatedMovie' in data) ||
    !isMovieHighlight(data.bestRatedMovie) ||
    !('mostPopularMovie' in data) ||
    !isMovieHighlight(data.mostPopularMovie)
  ) {
    throw new Error('Les informations des films à la une sont invalides.');
  }
  if (
    !('mostProfitableMovie' in data) ||
    !isFinancialMovieHighlight(data.mostProfitableMovie) ||
    !('leastProfitableMovie' in data) ||
    !isFinancialMovieHighlight(data.leastProfitableMovie)
  ) {
    throw new Error('Les informations de rentabilité sont invalides.');
  }
  if (
    !('topProductionCountry' in data) ||
    !isProductionCountryHighlight(data.topProductionCountry)
  ) {
    throw new Error('Les informations des pays de production sont invalides.');
  }
  return {
    movieCount: data.movieCount,
    years: data.years,
    topProductionCountry: data.topProductionCountry,
    averageRuntime: data.averageRuntime,
    runtimeMovieCount: data.runtimeMovieCount,
    averageRating: data.averageRating,
    ratedMovieCount: data.ratedMovieCount,
    bestRatedMovie: data.bestRatedMovie,
    mostPopularMovie: data.mostPopularMovie,
    mostProfitableMovie: data.mostProfitableMovie,
    leastProfitableMovie: data.leastProfitableMovie,
  };
}
