import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MostPopularMovieCard } from './MostPopularMovieCard';

describe('MostPopularMovieCard', () => {
  it('shows most popular movie content', () => {
    const markup = renderToStaticMarkup(
      <MostPopularMovieCard
        movie={{
          id: 1,
          title: 'Film populaire',
          year: 2020,
          rating: 8.5,
          voteCount: 200,
          popularity: 123.45,
          posterPath: '/poster.jpg',
        }}
      />,
    );

    expect(markup).toContain('Film le plus populaire');
    expect(markup).toContain('Film populaire');
    expect(markup).toContain('123,45 <span>popularité</span>');
    expect(markup).toContain('https://image.tmdb.org/t/p/w185/poster.jpg');
  });

  it('shows empty state when there is no movie', () => {
    const markup = renderToStaticMarkup(<MostPopularMovieCard movie={null} />);

    expect(markup).toContain('Aucun film disponible.');
  });
});
