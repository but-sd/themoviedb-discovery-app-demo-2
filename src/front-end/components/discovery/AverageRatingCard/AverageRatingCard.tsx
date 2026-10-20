/**
 * Carte affichant la note moyenne des films dans la base de données.
 * @param averageRating La note moyenne, ou null lorsqu'elle est inconnue.
 * @returns Un élément JSX représentant la carte de la note moyenne.
 */
export function AverageRatingCard({
  averageRating,
}: Readonly<{
  averageRating: number | null | undefined;
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">Note moyenne</span>
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
