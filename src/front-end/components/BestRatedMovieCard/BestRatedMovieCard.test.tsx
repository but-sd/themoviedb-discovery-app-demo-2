import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BestRatedMovieCard } from './BestRatedMovieCard';

describe('BestRatedMovieCard', () => {
  it('shows best rated movie content', () => {
    const markup = renderToStaticMarkup(
      <BestRatedMovieCard
        movie={{
          id: 1,
          title: 'Film à la une',
          year: 2020,
          rating: 8.5,
          voteCount: 200,
          popularity: 123,
          posterPath: '/poster.jpg',
        }}
      />,
    );

    expect(markup).toContain('Film le mieux noté');
    expect(markup).toContain('Film à la une');
    expect(markup).toContain('8,5 <span>/ 10</span>');
    expect(markup).toContain('https://image.tmdb.org/t/p/w185/poster.jpg');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(<BestRatedMovieCard movie={null} />);

    expect(markup).toContain('Aucun film avec au moins 100 votes.');
  });
});
