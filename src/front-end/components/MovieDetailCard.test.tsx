import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MovieDetails } from '../../back-end/schemas/MoviesTypes';
import MovieDetailCard from './MovieDetailCard';

const movie: MovieDetails = {
  id: 1,
  title: 'Film de test',
  original_title: 'Test Movie',
  original_language: 'en',
  overview: 'Résumé du film.',
  popularity: 12,
  poster_path: null,
  backdrop_path: null,
  release_date: '2020-01-01',
  vote_average: 7.5,
  vote_count: 100,
  genres: [],
  production_countries: [
    { iso_3166_1: 'FR', name: 'France' },
    { iso_3166_1: 'BE', name: 'Belgique' },
  ],
  tagline: null,
};

describe('MovieDetailCard', () => {
  it('shows production country names in the movie details', () => {
    const markup = renderToStaticMarkup(<MovieDetailCard movie={movie} />);

    expect(markup).toContain('Pays de production');
    expect(markup).toContain('France');
    expect(markup).toContain('Belgique');
    expect(markup).toContain('<li>France</li>');
  });

  it('omits the production countries section when no country is available', () => {
    const markup = renderToStaticMarkup(
      <MovieDetailCard movie={{ ...movie, production_countries: [] }} />,
    );

    expect(markup).not.toContain('Pays de production');
  });

  it('uses a subordinate title and French rating with an explicit scale', () => {
    const markup = renderToStaticMarkup(<MovieDetailCard movie={movie} />);
    expect(markup).toContain(
      '<h2 class="movie-detail-title">Film de test</h2>',
    );
    expect(markup).not.toContain('<h1');
    expect(markup).toContain('7,5 / 10');
    expect(markup).toContain('<h3>Pays de production</h3>');
  });

  it('does not present missing metadata or an unrated film as known values', () => {
    const markup = renderToStaticMarkup(
      <MovieDetailCard
        movie={{ ...movie, release_date: null, overview: '', vote_count: 0 }}
      />,
    );
    expect(markup.match(/Non disponible/g)).toHaveLength(2);
    expect(markup).toContain('Aucun résumé disponible.');
  });
});
