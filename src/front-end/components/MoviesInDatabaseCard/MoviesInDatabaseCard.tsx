/**
 * Card displaying the number of movies in the database and the collected year range.
 * @param movieCount The number of movies in the database.
 * @param years The array of collected years.
 * @returns A JSX element representing the movies in database card.
 */
export function MoviesInDatabaseCard({
  movieCount,
  years,
}: Readonly<{
  movieCount: number;
  years: number[];
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">Films en base</span>
        <p className="genre-highlight-value">
          {movieCount.toLocaleString('fr-FR')} <span>films</span>
        </p>
        <p className="genre-highlight-period">
          {years.length
            ? `${Math.min(...years)} – ${Math.max(...years)}`
            : 'Aucune année collectée'}
        </p>
      </summary>
    </details>
  );
}
