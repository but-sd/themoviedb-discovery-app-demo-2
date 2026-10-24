import type { ReactNode } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RepresentedGenresCard } from './RepresentedGenresCard';

function renderToStaticMarkup(element: ReactNode) {
  return renderMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe('RepresentedGenresCard', () => {
  it('shows represented genres count', () => {
    const markup = renderToStaticMarkup(
      <RepresentedGenresCard
        distribution={[
          { id: 1, name: 'Action', movieCount: 10 },
          { id: 2, name: 'Drame', movieCount: 5 },
        ]}
      />,
    );

    expect(markup).toContain('Genres représentés');
    expect(markup).toContain('Diversité du catalogue');
    expect(markup).toContain('2 <span>genres</span>');
    expect(markup).toMatch(/^<a[^>]+href="\/exploration\/movies\/genres"/);
    expect(markup).not.toContain('<summary');
  });

  it('keeps the empty card linked to genre exploration', () => {
    const markup = renderToStaticMarkup(
      <RepresentedGenresCard distribution={[]} />,
    );
    expect(markup).toContain('0 <span>genres</span>');
    expect(markup).toContain('href="/exploration/movies/genres"');
  });
});
