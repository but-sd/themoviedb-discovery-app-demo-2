import type { GenreDistribution } from '../../../back-end/schemas/MoviesTypes';

/**
 * Card displaying the dominant genre by number of films.
 * @param distribution Genres distribution.
 * @returns A JSX element representing dominant genre card.
 */
export function DominantGenreCard({
  distribution,
}: Readonly<{
  distribution: GenreDistribution[];
}>) {
  const maxCount = Math.max(...distribution.map((genre) => genre.movieCount));
  const mostRepresented = distribution.filter(
    (genre) => genre.movieCount === maxCount,
  );

  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">
          Genre dominant <span aria-hidden="true">↗</span>
        </span>
        {mostRepresented.length ? (
          <>
            <p className="genre-highlight-name">
              {mostRepresented[0].name}
              {mostRepresented.length > 1 && (
                <span className="genre-highlight-badge">
                  +{mostRepresented.length - 1}
                </span>
              )}
            </p>
            <p className="genre-highlight-value">
              {maxCount.toLocaleString('fr-FR')} <span>films</span>
            </p>
          </>
        ) : (
          <p>Aucun genre disponible.</p>
        )}
      </summary>
    </details>
  );
}
