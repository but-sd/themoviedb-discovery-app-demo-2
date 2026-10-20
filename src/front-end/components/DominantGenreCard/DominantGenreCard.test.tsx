import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DominantGenreCard } from './DominantGenreCard';

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
  });

  it('shows empty state when there is no genre', () => {
    const markup = renderToStaticMarkup(
      <DominantGenreCard distribution={[]} />,
    );

    expect(markup).toContain('Aucun genre disponible.');
  });
});
