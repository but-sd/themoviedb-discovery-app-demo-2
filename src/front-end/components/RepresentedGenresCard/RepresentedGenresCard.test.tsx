import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RepresentedGenresCard } from './RepresentedGenresCard';

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
  });
});
