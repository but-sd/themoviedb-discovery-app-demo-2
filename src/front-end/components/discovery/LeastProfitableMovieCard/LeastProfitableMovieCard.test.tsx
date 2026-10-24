import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LeastProfitableMovieCard } from './LeastProfitableMovieCard';

describe('LeastProfitableMovieCard', () => {
  it('shows least profitable movie content', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
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
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('Film le moins rentable');
    expect(markup).toContain('Film déficitaire');
    expect(markup).toContain('-75 <span>% ROI</span>');
    expect(markup).toContain('href="/movies/2"');
    expect(markup).toMatch(
      /^<a\b[^>]*class="genre-highlight featured-movie featured-movie-link"/,
    );
    expect(markup).toMatch(/<\/a>$/);
    expect(markup).not.toContain('<summary');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(
      <LeastProfitableMovieCard movie={null} />,
    );

    expect(markup).toContain('Aucun film avec budget et recettes connus.');
    expect(markup).not.toContain('href=');
  });
});
