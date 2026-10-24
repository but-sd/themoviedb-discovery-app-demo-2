export function AverageRatingCard({
  averageRating,
}: Readonly<{
  averageRating: number | null | undefined;
}>) {
  return (
    <details className="genre-highlight" aria-label="Note moyenne des films">
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
