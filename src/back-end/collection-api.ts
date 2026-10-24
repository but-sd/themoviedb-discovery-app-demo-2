import type { Express } from 'express';
import { collectMovies } from './collectMovies';
import { isValidMovieYear } from './discover-movies';
import { getCollectionSummary } from './database/collection-summary';
import {
  getGenreDistribution,
  getGenreRatings,
  getMovieYearDistribution,
  getMovieRuntimeDistribution,
  getMovieRatingDistribution,
  getMovieCountryDistribution,
} from './database/movie-statistics';

export function registerCollectionApi(app: Express): void {
  app.get('/api/movies/countries/distribution', (_req, res) => {
    try {
      res.json(getMovieCountryDistribution());
    } catch (error) {
      console.error('Failed to read movie country distribution:', error);
      res.status(500).json({
        error: 'Impossible de lire la répartition par pays de production.',
      });
    }
  });
  app.get('/api/movies/ratings/distribution', (_req, res) => {
    try {
      res.json(getMovieRatingDistribution());
    } catch (error) {
      console.error('Failed to read movie rating distribution:', error);
      res
        .status(500)
        .json({ error: 'Impossible de lire la répartition des notes.' });
    }
  });
  app.get('/api/movies/runtimes/distribution', (_req, res) => {
    try {
      res.json(getMovieRuntimeDistribution());
    } catch (error) {
      console.error('Failed to read movie runtime distribution:', error);
      res.status(500).json({
        error: 'Impossible de lire la répartition par durée.',
      });
    }
  });
  app.get('/api/movies/years/distribution', (_req, res) => {
    try {
      res.json(getMovieYearDistribution());
    } catch (error) {
      console.error('Failed to read movie year distribution:', error);
      res.status(500).json({
        error: 'Impossible de lire la répartition par année de sortie.',
      });
    }
  });
  app.get('/api/movies/genres/ratings', (_req, res) => {
    try {
      res.json(getGenreRatings());
    } catch (error) {
      console.error('Failed to read genre ratings:', error);
      res
        .status(500)
        .json({ error: 'Impossible de lire les notes par genre.' });
    }
  });
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
