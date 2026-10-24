import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MOVIE_RUNTIME_RANGES } from '../../back-end/schemas/MoviesTypes';
import MovieRuntimeDistributionChart from './MovieRuntimeDistributionChart';

const buckets = MOVIE_RUNTIME_RANGES.map(({ label }) => ({
  label,
  movieCount: 0,
}));

it('shows six duration ranges, proportional bars and unknown counts separately', () => {
  const data = {
    buckets: buckets.map((row, index) => ({
      ...row,
      movieCount: index === 0 ? 4 : 2,
    })),
    unknownMovieCount: 3,
  };
  const markup = renderToStaticMarkup(
    <MovieRuntimeDistributionChart data={data} />,
  );
  expect(markup).toContain('Durée inconnue : 3 films');
  expect(markup).toContain('role="img"');
  expect(markup).toContain('aria-labelledby=');
  expect(markup).toContain('tabindex="0"');
  expect(markup).toContain('height="120"');
  expect(markup).toContain('height="240"');
  expect(markup.match(/<rect /g)).toHaveLength(6);
  for (const row of data.buckets) {
    expect(markup).toContain(
      `<th scope="row">${row.label}</th><td>${row.movieCount}</td>`,
    );
  }
});

it('shows an explicit empty state', () => {
  const markup = renderToStaticMarkup(
    <MovieRuntimeDistributionChart data={{ buckets, unknownMovieCount: 0 }} />,
  );
  expect(markup).toContain('Aucun film à afficher');
  expect(markup).not.toContain('<svg');
});

it('supports only unknown runtimes without invalid bar heights', () => {
  const markup = renderToStaticMarkup(
    <MovieRuntimeDistributionChart data={{ buckets, unknownMovieCount: 10 }} />,
  );
  expect(markup).toContain('Durée inconnue : 10 films');
  expect(markup).not.toContain('Aucun film à afficher');
  expect(markup).not.toMatch(/NaN|Infinity/);
  expect(markup.match(/<rect /g)).toHaveLength(6);
});
