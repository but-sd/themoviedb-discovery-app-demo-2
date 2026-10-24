import type { ReactNode } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AverageRuntimeCard } from './AverageRuntimeCard';

function renderToStaticMarkup(element: ReactNode) {
  return renderMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe('AverageRuntimeCard', () => {
  it('shows rounded average runtime in minutes', () => {
    const markup = renderToStaticMarkup(
      <AverageRuntimeCard averageRuntime={112.6} />,
    );

    expect(markup).toContain('Durée moyenne');
    expect(markup).toContain('113 <span>min</span>');
    expect(markup).toMatch(/^<a[^>]+href="\/exploration\/movies\/runtimes"/);
    expect(markup).not.toContain('<summary');
  });

  it('shows unavailable state when runtime is unknown', () => {
    const markup = renderToStaticMarkup(
      <AverageRuntimeCard averageRuntime={null} />,
    );

    expect(markup).toContain('Durée moyenne');
    expect(markup).toContain('Non disponible');
    expect(markup).toContain('href="/exploration/movies/runtimes"');
  });
});
