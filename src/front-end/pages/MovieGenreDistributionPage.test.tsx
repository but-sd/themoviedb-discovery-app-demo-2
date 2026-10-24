import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import MovieGenreDistributionPage from './MovieGenreDistributionPage';

it('shows genre exploration with chart controls, loading feedback and a return link', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MovieGenreDistributionPage />
    </MemoryRouter>,
  );
  expect(markup).toContain('<h1>Répartition des films par genre</h1>');
  expect(markup).toContain('href="/exploration"');
  expect(markup).toContain('chacun de ses genres');
  expect(markup).toContain('Chargement du graphique');
  expect(markup.match(/<option /g)).toHaveLength(4);
});
