import express from 'express';
import { tmdbAccessToken } from './config';
import type {
  MoviesApiResponse,
  TmdbMoviesRawResponse,
} from './schemas/MoviesTypes';
import { toSupportedMovie } from './utils';
import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';

// Create a new express application instance
const app = express();

// Define a route handler for fetching popular movies from TMDB API
app.get(
  '/api/movies/popular',
  async (_req: express.Request, res: express.Response) => {
    try {
      // Create a URLSearchParams object to build the query string for the TMDB API request
      const queryParams = new URLSearchParams();

      // Extract query parameters from the request and append them to the query string
      const { language, page, region } = _req.query;

      // Append the query parameters to the URLSearchParams object, using default values if not provided in the request
      // parameters: language, page, region
      queryParams.append('language', (language as string) || DEFAULT_LANGUAGE);
      queryParams.append('page', (page as string) || DEFAULT_PAGE);
      queryParams.append('region', (region as string) || DEFAULT_REGION);

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

// Define a route handler for health check endpoint
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  const response: { status: string } = { status: 'ok' };
  res.json(response);
});

// Start the server and listen on the specified port
const port: number = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
