import type { Express } from 'express';
import express from 'express';
import { toSupportedMovie, toSupportedMovieDetails } from './utils';
import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import { tmdbAccessToken } from './config';
import type {
  MovieDetails,
  MoviesApiResponse,
  TmdbMovieDetails,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';

/**
 * Creates a URLSearchParams for the movie query parameters (language, page, region) with default values if not provided.
 * @param query - The query parameters from the Express request.
 * @returns A URLSearchParams object containing the language, page, and region parameters.
 */
function createMovieQueryParams(query: express.Request['query']): URLSearchParams {
  const { language, page, region } = query;
  const queryParams = new URLSearchParams();

  queryParams.append('language', (language as string) || DEFAULT_LANGUAGE);
  queryParams.append('page', (page as string) || DEFAULT_PAGE);
  queryParams.append('region', (region as string) || DEFAULT_REGION);

  return queryParams;
}

/**
 * Registers the movies API routes (popular movies and movie details) on the given Express application instance.
 * @param app - The Express application instance to register the movies API routes on.
 */
export function registerMoviesApi(app: Express): void {
  // Define a route handler for fetching popular movies from TMDB API
  app.get(
    '/api/movies/popular',
    async (_req: express.Request, res: express.Response) => {
      try {
        const queryParams = createMovieQueryParams(_req.query);

        // log the query parameters for debugging purposes
        console.log('Query Params:', queryParams.toString());

        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?${queryParams.toString()}`,
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

        // Parse the raw response from the TMDB API
        const rawData = (await response.json()) as TmdbMoviesRawResponse;

        // Transform the raw data into the supported format for our application
        const data: MoviesApiResponse = {
          page: rawData.page,
          results: rawData.results.map(toSupportedMovie),
          total_pages: rawData.total_pages,
          total_results: rawData.total_results,
        };

        res.json(data);
      } catch (error) {
        console.error('Error fetching popular movies:', error);
        res.status(500).json({ error: 'Failed to fetch popular movies' });
      }
    },
  );

  // Define a route handler for fetching movie details by ID from TMDB API
  app.get(
    '/api/movies/:id',
    async (_req: express.Request, res: express.Response) => {
      const movieId = _req.params.id;
      const queryParams = createMovieQueryParams(_req.query);

      // log the query parameters for debugging purposes
      console.log('Query Params:', queryParams.toString());

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?${queryParams.toString()}`,
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

        // Parse the raw response from the TMDB API
        const rawData = (await response.json()) as TmdbMovieDetails;

        // Transform the raw data into the supported format for our application
        const data: MovieDetails = toSupportedMovieDetails(rawData);

        // Send the transformed data as a JSON response
        res.json(data);
      } catch (error) {
        console.error(`Error fetching movie with ID ${movieId}:`, error);
        res
          .status(500)
          .json({ error: `Failed to fetch movie with ID ${movieId}` });
      }
    },
  );
}
