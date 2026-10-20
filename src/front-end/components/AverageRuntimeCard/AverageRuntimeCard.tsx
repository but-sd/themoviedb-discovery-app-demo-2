/**
 * Card displaying the average runtime of movies in the database.
 * @param averageRuntime The average runtime in minutes, or null when unknown.
 * @returns A JSX element representing the average runtime card.
 */
export function AverageRuntimeCard({
  averageRuntime,
}: Readonly<{
  averageRuntime: number | null | undefined;
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">Durée moyenne</span>
        <p className="genre-highlight-value">
          {averageRuntime != null ? (
            <>
              {Math.round(averageRuntime).toLocaleString('fr-FR')}{' '}
              <span>min</span>
            </>
          ) : (
            <span>Non disponible</span>
          )}
        </p>
      </summary>
    </details>
  );
}
