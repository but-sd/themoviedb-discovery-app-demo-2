import type { GenreDistribution } from '../../../back-end/schemas/MoviesTypes';

/**
 * Card displaying how many distinct genres are represented in the catalog.
 * @param distribution Genres distribution.
 * @returns A JSX element representing represented genres card.
 */
export function RepresentedGenresCard({
  distribution,
}: Readonly<{
  distribution: GenreDistribution[];
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">
          Genres représentés <span aria-hidden="true">↗</span>
        </span>
        <p className="genre-highlight-name">Diversité du catalogue</p>
        <p className="genre-highlight-value">
          {distribution.length.toLocaleString('fr-FR')} <span>genres</span>
        </p>
      </summary>
    </details>
  );
}
