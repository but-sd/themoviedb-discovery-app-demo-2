import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import MovieGenreRatingsPage from './MovieGenreRatingsPage';

it.each([false, true])(
  'shows genre ratings with the correct calculation (weighted=%s)',
  (weighted) => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MovieGenreRatingsPage weighted={weighted} />
      </MemoryRouter>,
    );
    expect(markup).toContain(
      weighted
        ? '<h1>Notes moyennes pondérées par genre</h1>'
        : '<h1>Notes moyennes par genre</h1>',
    );
    expect(markup).toContain(
      weighted ? 'somme(note × votes) / somme(votes)' : 'sans pondération',
    );
    expect(markup).toContain('href="/exploration"');
    expect(markup).toContain('Chargement du graphique');
    expect(markup.match(/<option /g)).toHaveLength(2);
    expect(markup).not.toContain('Camembert');
  },
);
