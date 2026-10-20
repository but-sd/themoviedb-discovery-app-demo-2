/**
 * Card displaying the average movie rating in the database.
 * @param averageRating The average rating, or null when unknown.
 * @returns A JSX element representing the average rating card.
 */
export function AverageRatingCard({
  averageRating,
}: Readonly<{
  averageRating: number | null | undefined;
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">
          Note moyenne <span aria-hidden="true">☆</span>
        </span>
        <p className="genre-highlight-value">
          {averageRating != null ? (
            <>
              {averageRating.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
              })}{' '}
              <span>/ 10</span>
            </>
          ) : (
            <span>Non disponible</span>
          )}
        </p>
      </summary>
    </details>
  );
}
