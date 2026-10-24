import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import MovieCountryDistributionChart from './MovieCountryDistributionChart';

it('shows every country in an accessible chart and table with separate unknown counts', () => {
  const markup = renderToStaticMarkup(
    <MovieCountryDistributionChart
      data={{
        countries: [
          { code: 'FR', name: 'France', movieCount: 4 },
          { code: 'BE', name: 'Belgium', movieCount: 2 },
        ],
        unknownMovieCount: 3,
      }}
    />,
  );
  expect(markup).toContain('role="img"');
  expect(markup).toContain('aria-labelledby=');
  expect(markup.match(/<option /g)).toHaveLength(4);
  expect(markup).toContain(
    '<summary>Afficher les données du graphique</summary>',
  );
  expect(markup).toContain('<th scope="row">France (FR)</th><td>4</td>');
  expect(markup).toContain('<th scope="row">Belgium (BE)</th><td>2</td>');
  expect(markup).toContain('Films sans pays de production renseigné : 3');
});

it.each([0, 10])(
  'handles catalogs without countries (%s films)',
  (unknownMovieCount) => {
    const markup = renderToStaticMarkup(
      <MovieCountryDistributionChart
        data={{ countries: [], unknownMovieCount }}
      />,
    );
    expect(markup).toContain(
      unknownMovieCount
        ? 'Aucun pays de production disponible'
        : 'Aucun film à afficher',
    );
    expect(markup).not.toContain('<canvas');
    expect(markup).not.toMatch(/NaN|Infinity/);
  },
);
