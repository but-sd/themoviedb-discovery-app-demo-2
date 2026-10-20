import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MostProfitableMovieCard } from './MostProfitableMovieCard';

describe('MostProfitableMovieCard', () => {
  it('shows most profitable movie content', () => {
    const markup = renderToStaticMarkup(
      <MostProfitableMovieCard
        movie={{
          id: 1,
          title: 'Film rentable',
          year: 2020,
          rating: 7,
          voteCount: 10,
          popularity: 5,
          budget: 1000,
          revenue: 4500,
          returnOnInvestment: 350,
        }}
      />,
    );

    expect(markup).toContain('Film le plus rentable');
    expect(markup).toContain('Film rentable');
    expect(markup).toContain('350 <span>% ROI</span>');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(
      <MostProfitableMovieCard movie={null} />,
    );

    expect(markup).toContain('Aucun film avec budget et recettes connus.');
  });
});
