import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AverageRuntimeCard } from './AverageRuntimeCard';

describe('AverageRuntimeCard', () => {
  it('shows rounded average runtime in minutes', () => {
    const markup = renderToStaticMarkup(
      <AverageRuntimeCard averageRuntime={112.6} />,
    );

    expect(markup).toContain('Durée moyenne');
    expect(markup).toContain('113 <span>min</span>');
  });

  it('shows unavailable state when runtime is unknown', () => {
    const markup = renderToStaticMarkup(
      <AverageRuntimeCard averageRuntime={null} />,
    );

    expect(markup).toContain('Durée moyenne');
    expect(markup).toContain('Non disponible');
  });
});
