import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MostProfitableMovieCard } from './MostProfitableMovieCard';

describe('MostProfitableMovieCard', () => {
  it('shows most profitable movie content', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
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
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('Film le plus rentable');
    expect(markup).toContain('Film rentable');
    expect(markup).toContain('350 <span>% ROI</span>');
    expect(markup).toContain('href="/movies/1"');
    expect(markup).toMatch(
      /^<a\b[^>]*class="genre-highlight featured-movie featured-movie-link"/,
    );
    expect(markup).toMatch(/<\/a>$/);
    expect(markup).not.toContain('<summary');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(
      <MostProfitableMovieCard movie={null} />,
    );

    expect(markup).toContain('Aucun film avec budget et recettes connus.');
    expect(markup).not.toContain('href=');
  });
});
