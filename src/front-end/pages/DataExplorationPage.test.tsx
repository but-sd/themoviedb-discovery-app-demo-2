import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import DataExplorationPage from './DataExplorationPage';
import AdministrationPage from './AdministrationPage';

it('renders the collection form with start and end year fields', () => {
  const markup = renderToStaticMarkup(<AdministrationPage />);
  expect(markup).toContain('Année de début');
  expect(markup).toContain('Année de fin');
  expect(markup).toContain('Chargement des informations de la base');
  expect(markup.match(/type="number"/g)).toHaveLength(2);
  expect(markup).toContain('100 films par année');
});

it('keeps collection controls out of the exploration page', () => {
  const markup = renderToStaticMarkup(<DataExplorationPage />);
  expect(markup).toContain('Exploration des données');
  expect(markup).not.toContain('<form');
  expect(markup).not.toContain('Année de début');
});
