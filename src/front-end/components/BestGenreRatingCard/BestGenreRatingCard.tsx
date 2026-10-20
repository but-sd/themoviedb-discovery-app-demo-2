import type { GenreRating } from '../../../back-end/schemas/MoviesTypes';

/**
 * Card displaying the best average genre rating.
 * @param ratings Genre ratings.
 * @returns A JSX element representing best genre rating card.
 */
export function BestGenreRatingCard({
  ratings,
}: Readonly<{
  ratings: GenreRating[];
}>) {
  const maxRating = Math.max(...ratings.map((genre) => genre.averageRating));
  const highestRated = ratings.filter(
    (genre) => genre.averageRating === maxRating,
  );

  return (
    <details className="genre-highlight genre-highlight--rating">
      <summary>
        <span className="genre-highlight-label">
          Meilleure note <span aria-hidden="true">☆</span>
        </span>
        {highestRated.length ? (
          <>
            <p className="genre-highlight-name">
              {highestRated[0].name}
              {highestRated.length > 1 && (
                <span className="genre-highlight-badge">
                  +{highestRated.length - 1}
                </span>
              )}
            </p>
            <p className="genre-highlight-value">
              {maxRating.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
              })}{' '}
              <span>/ 10</span>
            </p>
          </>
        ) : (
          <p>Aucun film noté disponible.</p>
        )}
      </summary>
    </details>
  );
}
