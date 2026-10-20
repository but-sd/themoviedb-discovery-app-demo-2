import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BestWeightedGenreRatingCard } from './BestWeightedGenreRatingCard';

describe('BestWeightedGenreRatingCard', () => {
  it('shows best weighted genre rating', () => {
    const markup = renderToStaticMarkup(
      <BestWeightedGenreRatingCard
        ratings={[
          {
            id: 1,
            name: 'Action',
            movieCount: 12,
            averageRating: 8.25,
            weightedAverageRating: 7,
            voteCount: 50,
          },
          {
            id: 2,
            name: 'Drame',
            movieCount: 35,
            averageRating: 6,
            weightedAverageRating: 8.5,
            voteCount: 100,
          },
        ]}
      />,
    );

    expect(markup).toContain('Meilleure note pondérée');
    expect(markup).toContain('Drame');
    expect(markup).toContain('8,5 <span>/ 10</span>');
  });

  it('shows empty state when there is no rated movie', () => {
    const markup = renderToStaticMarkup(
      <BestWeightedGenreRatingCard ratings={[]} />,
    );

    expect(markup).toContain('Aucun film noté disponible.');
  });
});
