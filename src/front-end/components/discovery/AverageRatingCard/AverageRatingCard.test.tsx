import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AverageRatingCard } from './AverageRatingCard';

/**
 * Tests for the AverageRatingCard component
 */
describe('AverageRatingCard', () => {
  it('shows average rating with two decimals maximum', () => {
    const markup = renderToStaticMarkup(
      <AverageRatingCard averageRating={7.256} />,
    );

    // functionnality: should display the average rating with two decimals at most
    expect(markup).toContain('Note moyenne');
    expect(markup).toContain('7,26 <span>/ 10</span>');

    // accessibility: should have an appropriate aria-label
    expect(markup).toContain('aria-label="Note moyenne des films"');
  });

  it('shows average rating with one decimal when appropriate', () => {
    const markup = renderToStaticMarkup(
      <AverageRatingCard averageRating={7.2} />,
    );

    expect(markup).toContain('7,2 <span>/ 10</span>');
  });

  it('shows unavailable state when rating is unknown', () => {
    const markup = renderToStaticMarkup(
      <AverageRatingCard averageRating={null} />,
    );

    expect(markup).toContain('Note moyenne');
    expect(markup).toContain('Non disponible');
  });
});
