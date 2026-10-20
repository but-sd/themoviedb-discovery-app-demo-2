import type { ReactNode } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { GenreHighlightCards } from './GenreHighlights';

function renderToStaticMarkup(element: ReactNode) {
  return renderMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

it('shows the leading production country in the film indicators', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 20,
        years: [2026],
        topProductionCountry: { code: 'FR', name: 'France', movieCount: 12 },
      }}
    />,
  );
  const filmGroup = markup.split('aria-label="Indicateurs des films"')[1];
  expect(filmGroup).toContain('Pays le plus représenté');
  expect(filmGroup).toContain('France');
  expect(filmGroup).toContain('12 <span>films</span>');
});

it('shows financial highlights with ROI, amounts and the calculation limits', () => {
  const movie = {
    id: 1,
    title: 'Film rentable',
    year: 2020,
    rating: 7,
    voteCount: 10,
    popularity: 5,
    budget: 1000,
    revenue: 4500,
    returnOnInvestment: 350,
  };
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 2,
        years: [2020],
        mostProfitableMovie: movie,
        leastProfitableMovie: {
          ...movie,
          id: 2,
          title: 'Film déficitaire',
          revenue: 250,
          returnOnInvestment: -75,
        },
      }}
    />,
  );
  expect(markup).toContain('Film le plus rentable');
  expect(markup).toContain('Film le moins rentable');
  expect(markup).toContain('Film rentable');
  expect(markup).toContain('Film déficitaire');
  expect(markup).toContain('350 <span>% ROI</span>');
  expect(markup).toContain('-75 <span>% ROI</span>');
});

it('shows an explicit empty state for both financial cards', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 0,
        years: [],
        mostProfitableMovie: null,
        leastProfitableMovie: null,
      }}
    />,
  );
  expect(
    markup.match(/Aucun film avec budget et recettes connus./g),
  ).toHaveLength(2);
  expect(markup).not.toContain('NaN');
});

it('shows the best rated and most popular films in the film panel', () => {
  const movie = {
    id: 1,
    title: 'Film à la une',
    year: 2020,
    rating: 8.5,
    voteCount: 200,
    popularity: 123,
    posterPath: '/poster.jpg',
  };
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 1,
        years: [2020],
        bestRatedMovie: movie,
        mostPopularMovie: movie,
      }}
    />,
  );
  expect(markup).toContain('Film le mieux noté');
  expect(markup).toContain('Film le plus populaire');
  expect(markup.match(/Film à la une/g)).toHaveLength(2);
  expect(markup.match(/class="featured-movie-poster"/g)).toHaveLength(2);
  expect(markup).toContain('https://image.tmdb.org/t/p/w185/poster.jpg');
  expect(markup).toContain('class="catalog-metrics"');
});

it('shows the global average rating and number of rated films', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 10,
        years: [2020],
        averageRating: 7.25,
        ratedMovieCount: 8,
      }}
    />,
  );
  expect(markup).toContain('Note moyenne');
  expect(markup).toContain('7,25');
});

it('shows average runtime in the film group', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{
        movieCount: 10,
        years: [2020],
        averageRuntime: 112.6,
        runtimeMovieCount: 8,
      }}
    />,
  );
  expect(markup).toContain('Durée moyenne');
  expect(markup).toContain('113');
});

it('groups genre indicators separately from movie coverage', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{ movieCount: 0, years: [] }}
    />,
  );
  expect(markup).toContain('aria-label="Indicateurs des genres"');
  expect(markup).toContain('aria-label="Indicateurs des films"');
  const genreGroup = markup.split('aria-label="Indicateurs des films"')[0];
  expect(genreGroup).toContain('Genres représentés');
  expect(genreGroup).toContain('Genre dominant');
  expect(genreGroup).toContain('Meilleure note');
  expect(genreGroup).not.toContain('Films en base');
});

it('shows the number of represented genres and their names in the details', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[
        { id: 1, name: 'Action', movieCount: 10 },
        { id: 2, name: 'Drame', movieCount: 5 },
      ]}
      ratings={[]}
    />,
  );
  expect(markup).toContain('Genres représentés');
  expect(markup).toContain('2 <span>genres</span>');
  expect(markup).toContain('Diversité du catalogue');
});

it('shows the database count and collected year bounds without implying continuous coverage', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{ movieCount: 300, years: [2024, 2020, 2022] }}
    />,
  );
  expect(markup).toContain('Films en base');
  expect(markup).toContain('300');
  expect(markup).toContain('2020 – 2024');
});

it('shows an empty database without invalid year bounds', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[]}
      ratings={[]}
      summary={{ movieCount: 0, years: [] }}
    />,
  );
  expect(markup).toContain('Aucune année collectée');
  expect(markup).not.toContain('Infinity');
});

it('selects the highest count and rating even when data is not sorted', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards
      distribution={[
        { id: 1, name: 'Action', movieCount: 12 },
        { id: 2, name: 'Drame', movieCount: 35 },
      ]}
      ratings={[
        {
          id: 2,
          name: 'Drame',
          movieCount: 35,
          averageRating: 6,
          weightedAverageRating: 8.5,
          voteCount: 100,
        },
        {
          id: 1,
          name: 'Action',
          movieCount: 12,
          averageRating: 8.25,
          weightedAverageRating: 7,
          voteCount: 50,
        },
      ]}
    />,
  );
  expect(markup).toContain('Drame');
  expect(markup).toContain('35');
  expect(markup).toContain('8,25');
  expect(markup).toContain('Action');
  const weightedCard = markup.split('Meilleure note pondérée')[1];
  expect(weightedCard).toContain('Drame');
  expect(weightedCard).toContain('8,5');
  expect(weightedCard).not.toContain('Action');
});

it('shows empty states rather than invalid values', () => {
  const markup = renderToStaticMarkup(
    <GenreHighlightCards distribution={[]} ratings={[]} />,
  );
  expect(markup).toContain('Aucun genre disponible');
  expect(markup).toContain('Aucun film noté disponible');
  expect(markup).not.toContain('Infinity');
});

it('includes all tied genres', () => {
  const genres = [
    {
      id: 1,
      name: 'Action',
      movieCount: 10,
      averageRating: 7,
      weightedAverageRating: 7,
      voteCount: 20,
    },
    {
      id: 2,
      name: 'Drame',
      movieCount: 10,
      averageRating: 7,
      weightedAverageRating: 7,
      voteCount: 30,
    },
  ];
  const markup = renderToStaticMarkup(
    <GenreHighlightCards distribution={genres} ratings={genres} />,
  );
  expect(markup.match(/genre-highlight-badge/g)).toHaveLength(3);
});
