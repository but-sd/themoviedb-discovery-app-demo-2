import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AverageRatingCard } from './AverageRatingCard';

describe('AverageRatingCard', () => {
  it('shows average rating with two decimals maximum', () => {
    const markup = renderToStaticMarkup(
      <AverageRatingCard averageRating={7.256} />,
    );

    expect(markup).toContain('Note moyenne');
    expect(markup).toContain('7,26 <span>/ 10</span>');
  });

  it('shows unavailable state when rating is unknown', () => {
    const markup = renderToStaticMarkup(
      <AverageRatingCard averageRating={null} />,
    );

    expect(markup).toContain('Note moyenne');
    expect(markup).toContain('Non disponible');
  });
});
