import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import DataExplorationPage from './DataExplorationPage';

it('renders the collection form with start and end year fields', () => {
  const markup = renderToStaticMarkup(<DataExplorationPage />);
  expect(markup).toContain('Année de début');
  expect(markup).toContain('Année de fin');
  expect(markup).toContain('Collecte data');
  expect(markup.match(/type="number"/g)).toHaveLength(2);
  expect(markup).toContain('100 films par année');
});
