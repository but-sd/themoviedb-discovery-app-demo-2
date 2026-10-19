import type { Express } from 'express';
import { collectMovies } from './collectMovies';
import { isValidMovieYear } from './discover-movies';

export function registerCollectionApi(app: Express): void {
  app.post('/api/movies/collect', async (req, res) => {
    const { year } = req.query;
    if (!isValidMovieYear(year)) {
      res.status(400).json({ error: 'Année invalide.' });
      return;
    }
    try {
      const result = await collectMovies(Number(year));
      res.json({ year: result.year, collected: result.collected });
    } catch (error) {
      console.error('Movie collection failed:', error);
      res.status(500).json({
        error: `Impossible de collecter les films de ${year}. Les années déjà collectées sont conservées.`,
      });
    }
  });
}
