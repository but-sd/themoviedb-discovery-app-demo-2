import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MOVIE_RATING_RANGES } from '../../back-end/schemas/MoviesTypes';
import MovieRatingDistributionCharts from './MovieRatingDistributionCharts';

const buckets = MOVIE_RATING_RANGES.map(({ label }) => ({
  label,
  movieCount: 0,
}));

it('renders both charts with accessible canvases, appropriate views and complete tables', () => {
  const markup = renderToStaticMarkup(
    <MovieRatingDistributionCharts
      data={{
        buckets: buckets.map((row, index) => ({
          ...row,
          movieCount: index === 5 ? 1 : 0,
        })),
        years: [{ year: 2020, averageRating: 5.256, movieCount: 1 }],
        unratedMovieCount: 3,
      }}
    />,
  );
  expect(markup.match(/role="img"/g)).toHaveLength(2);
  expect(markup.match(/<table>/g)).toHaveLength(2);
  expect(markup).toContain('Films non notés : 3');
  expect(markup).toContain('<th scope="row">5–&lt;6</th><td>1</td>');
  expect(markup).toContain('<th scope="row">2020</th><td>5,26</td><td>1</td>');
  expect(markup.match(/<option /g)).toHaveLength(6);
  const annualChart = markup.split(
    '<h2>Note moyenne par année de sortie</h2>',
  )[1];
  expect(annualChart).not.toContain('Camembert');
  expect(annualChart).not.toContain('Anneau');
  expect(markup).toContain('sans pondération');
});

it('distinguishes a rated film with zero rating from an unrated film', () => {
  const markup = renderToStaticMarkup(
    <MovieRatingDistributionCharts
      data={{
        buckets: buckets.map((row, index) => ({
          ...row,
          movieCount: index === 0 ? 1 : 0,
        })),
        years: [{ year: 2020, averageRating: 0, movieCount: 1 }],
        unratedMovieCount: 0,
      }}
    />,
  );
  expect(markup).toContain('<th scope="row">2020</th><td>0</td><td>1</td>');
  expect(markup).not.toContain('Aucun film noté');
  expect(markup).not.toMatch(/NaN|Infinity/);
});

it.each([0, 10])(
  'handles catalogs with no rated films (%s unrated)',
  (unratedMovieCount) => {
    const markup = renderToStaticMarkup(
      <MovieRatingDistributionCharts
        data={{ buckets, years: [], unratedMovieCount }}
      />,
    );
    expect(markup).toContain(
      unratedMovieCount
        ? 'Aucun film noté disponible'
        : 'Aucun film à afficher',
    );
    expect(markup).not.toContain('<svg');
  },
);
