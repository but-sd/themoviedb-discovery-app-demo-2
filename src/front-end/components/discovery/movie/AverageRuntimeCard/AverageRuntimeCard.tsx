/**
 * Carte affichant la durée moyenne des films dans la base de données.
 * @param averageRuntime La durée moyenne en minutes, ou null si elle est inconnue.
 * @returns Un élément JSX représentant la carte de la durée moyenne.
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
