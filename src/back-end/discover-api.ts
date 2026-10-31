import type { Express } from 'express';
import { discoverMovies } from './tmdb-service.ts';

export function registerDiscoverApi(app: Express): void {
  app.get('/api/discover/movies', async (req, res) => {
    const { year, language, page, region } = req.query;

    if (typeof year !== 'string' || !/^[1-9]\d{3}$/.test(year)) {
      res.status(400).json({
        error: 'year must be a four-digit year between 1000 and 9999',
      });
      return;
    }

    try {
      res.json(
        await discoverMovies({
          year,
          language:
            typeof language === 'string' && language ? language : undefined,
          page: typeof page === 'string' && page ? page : undefined,
          region: typeof region === 'string' && region ? region : undefined,
        }),
      );
    } catch (error) {
      console.error(`Error discovering movies for year ${year}:`, error);
      res.status(500).json({ error: 'Failed to discover movies' });
    }
  });
}
