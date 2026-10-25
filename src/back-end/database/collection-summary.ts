import type {
  CollectionSummary,
  FinancialMovieHighlight,
  MovieHighlight,
} from '../schemas/MoviesTypes';
import { createMoviesDatabase, DEFAULT_DATABASE_PATH } from './connection';

export function getCollectionSummary(
  databasePath = DEFAULT_DATABASE_PATH,
): CollectionSummary {
  const database = createMoviesDatabase(databasePath);
  try {
    const count = database
      .prepare('SELECT COUNT(*) AS count FROM movies')
      .get();
    const years = database
      .prepare(`
      SELECT DISTINCT release_year AS year FROM movies WHERE release_year IS NOT NULL
      ORDER BY year
    `)
      .all();
    const runtime = database
      .prepare(`
      SELECT AVG(runtime_minutes) AS average, COUNT(*) AS count
      FROM movies WHERE runtime_minutes > 0
    `)
      .get();
    const rating = database
      .prepare(`
      SELECT AVG(vote_average) AS average, COUNT(*) AS count
      FROM movies WHERE vote_count > 0 AND vote_average IS NOT NULL
    `)
      .get();
    const bestRated = database
      .prepare(`
      SELECT * FROM movies WHERE vote_count >= 100 AND vote_average IS NOT NULL
      ORDER BY vote_average DESC, vote_count DESC, id LIMIT 1
    `)
      .get();
    const mostPopular = database
      .prepare(`
      SELECT * FROM movies WHERE popularity IS NOT NULL
      ORDER BY popularity DESC, vote_count DESC, id LIMIT 1
    `)
      .get();
    const topCountry = database
      .prepare(`
      SELECT countries.code, countries.name, COUNT(*) AS movie_count
      FROM production_countries
      JOIN countries ON countries.code = production_countries.country_code
      GROUP BY countries.code, countries.name
      ORDER BY movie_count DESC, countries.code
      LIMIT 1
    `)
      .get();
    function toHighlight(row: typeof bestRated): MovieHighlight | null {
      return row
        ? {
            id: Number(row.id),
            title: String(row.title),
            year: row.release_year === null ? null : Number(row.release_year),
            rating: row.vote_average === null ? null : Number(row.vote_average),
            voteCount: row.vote_count === null ? null : Number(row.vote_count),
            popularity: row.popularity === null ? null : Number(row.popularity),
            posterPath:
              row.poster_path === null ? null : String(row.poster_path),
          }
        : null;
    }
    function financialHighlight(
      direction: 'ASC' | 'DESC',
    ): FinancialMovieHighlight | null {
      const row = database
        .prepare(`
        SELECT *, (1.0 * revenue / budget - 1) * 100 AS roi
        FROM movies WHERE budget > 0 AND revenue > 0
        ORDER BY roi ${direction}, id LIMIT 1
      `)
        .get();
      const highlight = toHighlight(row);
      return row && highlight
        ? {
            ...highlight,
            budget: Number(row.budget),
            revenue: Number(row.revenue),
            returnOnInvestment: Number(row.roi),
          }
        : null;
    }
    return {
      movieCount: Number(count?.count),
      topProductionCountry: topCountry
        ? {
            code: String(topCountry.code),
            name: String(topCountry.name),
            movieCount: Number(topCountry.movie_count),
          }
        : null,
      years: years.map((row) => Number(row.year)),
      averageRuntime: runtime?.average == null ? null : Number(runtime.average),
      runtimeMovieCount: Number(runtime?.count),
      averageRating: rating?.average == null ? null : Number(rating.average),
      ratedMovieCount: Number(rating?.count),
      bestRatedMovie: toHighlight(bestRated),
      mostPopularMovie: toHighlight(mostPopular),
      mostProfitableMovie: financialHighlight('DESC'),
      leastProfitableMovie: financialHighlight('ASC'),
    };
  } finally {
    database.close();
  }
}
