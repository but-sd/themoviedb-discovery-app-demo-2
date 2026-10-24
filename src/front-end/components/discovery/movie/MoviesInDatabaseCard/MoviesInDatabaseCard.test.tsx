import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard';

function renderToStaticMarkup(element: ReactNode) {
  return renderMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe('MoviesInDatabaseCard', () => {
  it('shows movie count and year range bounds', () => {
    const markup = renderToStaticMarkup(
      <MoviesInDatabaseCard movieCount={1234} years={[2024, 2020, 2022]} />,
    );

    expect(markup).toContain('Films en base');
    expect(markup).toContain('1\u202f234 <span>films</span>');
    expect(markup).toContain('2020 – 2024');
    expect(markup).toMatch(/^<a[^>]+href="\/exploration\/movies\/years"/);
    expect(markup).not.toContain('<summary');
  });

  it('shows empty years state', () => {
    const markup = renderToStaticMarkup(
      <MoviesInDatabaseCard movieCount={0} years={[]} />,
    );

    expect(markup).toContain('0 <span>films</span>');
    expect(markup).toContain('Aucune année présente');
  });
});
