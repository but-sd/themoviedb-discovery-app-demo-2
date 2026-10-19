import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import GenreDistributionChart from './GenreDistributionChart';

it('offers only bar charts for average ratings and explains the calculation', () => {
  const markup = renderToStaticMarkup(
    <GenreDistributionChart revision={null} metric="rating" />,
  );
  expect(markup).toContain('Notes moyennes par genre');
  expect(markup).toContain('sans pondération');
  expect(markup.match(/<option /g)).toHaveLength(2);
  expect(markup).not.toContain('Camembert');
});

it('offers four chart views with horizontal bars selected by default', () => {
  const markup = renderToStaticMarkup(
    <GenreDistributionChart revision={null} />,
  );
  expect(markup).toContain('Type de graphique');
  expect(markup).toContain(
    '<option value="horizontal" selected="">Barres horizontales</option>',
  );
  expect(markup).toContain('Barres verticales');
  expect(markup).toContain('Anneau');
  expect(markup).toContain('Camembert');
  expect(markup.match(/<option /g)).toHaveLength(4);
});
