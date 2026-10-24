import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import MovieYearDistributionChart from './MovieYearDistributionChart';

it('offers four chart views and a complete accessible data table', () => {
  const markup = renderToStaticMarkup(
    <MovieYearDistributionChart
      data={[
        { year: 2020, movieCount: 2 },
        { year: 2024, movieCount: 4 },
      ]}
    />,
  );
  expect(markup).toContain('role="img"');
  expect(markup).toContain('aria-labelledby=');
  expect(markup).toContain('Barres horizontales');
  expect(markup.match(/<option /g)).toHaveLength(4);
  expect(markup).toContain(
    '<summary>Afficher les données du graphique</summary>',
  );
  expect(markup).toContain('<th scope="row">2020</th><td>2</td>');
  expect(markup).toContain('<th scope="row">2024</th><td>4</td>');
});

it('renders an explicit empty state instead of an empty chart', () => {
  const markup = renderToStaticMarkup(<MovieYearDistributionChart data={[]} />);
  expect(markup).toContain('Aucun film à afficher');
  expect(markup).not.toContain('<svg');
});
