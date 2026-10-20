import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LeastProfitableMovieCard } from './LeastProfitableMovieCard';

describe('LeastProfitableMovieCard', () => {
  it('shows least profitable movie content', () => {
    const markup = renderToStaticMarkup(
      <LeastProfitableMovieCard
        movie={{
          id: 2,
          title: 'Film déficitaire',
          year: 2020,
          rating: 7,
          voteCount: 10,
          popularity: 5,
          budget: 1000,
          revenue: 250,
          returnOnInvestment: -75,
        }}
      />,
    );

    expect(markup).toContain('Film le moins rentable');
    expect(markup).toContain('Film déficitaire');
    expect(markup).toContain('-75 <span>% ROI</span>');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(
      <LeastProfitableMovieCard movie={null} />,
    );

    expect(markup).toContain('Aucun film avec budget et recettes connus.');
  });
});
