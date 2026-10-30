import type { Express } from 'express';
import { tmdbAccessToken } from './config';
import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import type {
  MoviesApiResponse,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';
import { toSupportedMovie } from './utils';

export function registerDiscoverApi(app: Express): void {
  app.get('/api/discover/movies', async (req, res) => {
    const { year, language, page, region } = req.query;

    if (typeof year !== 'string' || !/^[1-9]\d{3}$/.test(year)) {
      res.status(400).json({
        error: 'year must be a four-digit year between 1000 and 9999',
      });
      return;
    }

    const queryParams = new URLSearchParams({
      primary_release_year: year,
      language:
        typeof language === 'string' && language ? language : DEFAULT_LANGUAGE,
      page: typeof page === 'string' && page ? page : DEFAULT_PAGE,
      region: typeof region === 'string' && region ? region : DEFAULT_REGION,
    });

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tmdbAccessToken}`,
            'Content-Type': 'application/json;charset=utf-8',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `TMDB API request failed with status ${response.status}`,
        );
      }

      const rawData = (await response.json()) as TmdbMoviesRawResponse;
      const data: MoviesApiResponse = {
        page: rawData.page,
        results: rawData.results.map(toSupportedMovie),
        total_pages: rawData.total_pages,
        total_results: rawData.total_results,
      };

      res.json(data);
    } catch (error) {
      console.error(`Error discovering movies for year ${year}:`, error);
      res.status(500).json({ error: 'Failed to discover movies' });
    }
  });
}
