import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { AverageRatingCard } from './AverageRatingCard';

it.each([
  [7.256, '7,26'],
  [0, '0'],
  [null, 'Non disponible'],
  [undefined, 'Non disponible'],
])(
  'links the whole average rating card to exploration for %s',
  (rating, text) => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AverageRatingCard averageRating={rating} />
      </MemoryRouter>,
    );
    expect(markup).toMatch(/^<a[^>]+href="\/exploration\/movies\/ratings"/);
    expect(markup).toContain('Note moyenne');
    expect(markup).toContain(text);
    expect(markup).not.toContain('<summary');
  },
);
