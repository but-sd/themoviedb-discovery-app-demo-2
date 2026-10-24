import type { ReactNode } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DominantGenreCard } from './DominantGenreCard';

function renderToStaticMarkup(element: ReactNode) {
  return renderMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe('DominantGenreCard', () => {
  it('shows dominant genre and count', () => {
    const markup = renderToStaticMarkup(
      <DominantGenreCard
        distribution={[
          { id: 1, name: 'Action', movieCount: 12 },
          { id: 2, name: 'Drame', movieCount: 35 },
        ]}
      />,
    );

    expect(markup).toContain('Genre dominant');
    expect(markup).toContain('Drame');
    expect(markup).toContain('35 <span>films</span>');
    expect(markup).toMatch(/^<a[^>]+href="\/exploration\/movies\/genres"/);
    expect(markup).not.toContain('<summary');
  });

  it('shows empty state when there is no genre', () => {
    const markup = renderToStaticMarkup(
      <DominantGenreCard distribution={[]} />,
    );

    expect(markup).toContain('Aucun genre disponible.');
    expect(markup).toContain('href="/exploration/movies/genres"');
  });
});
