import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import GenreDistributionChart from './GenreDistributionChart';

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
