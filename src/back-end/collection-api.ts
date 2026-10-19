import type { Express } from 'express';
import { collectMovies } from './collectMovies';
import { isValidMovieYear } from './discover-movies';
import { getCollectionSummary, getGenreDistribution } from './movies-database';

export function registerCollectionApi(app: Express): void {
  app.get('/api/movies/genres/distribution', (_req, res) => {
    try {
      res.json(getGenreDistribution());
    } catch (error) {
      console.error('Failed to read genre distribution:', error);
      res
        .status(500)
        .json({ error: 'Impossible de lire la répartition par genre.' });
    }
  });
  app.get('/api/movies/collection', (_req, res) => {
    try {
      res.json(getCollectionSummary());
    } catch (error) {
      console.error('Failed to read collection summary:', error);
      res
        .status(500)
        .json({ error: 'Impossible de lire les informations de la base.' });
    }
  });
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
