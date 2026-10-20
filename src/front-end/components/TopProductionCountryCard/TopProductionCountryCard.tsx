import type { ProductionCountryHighlight } from '../../../back-end/schemas/MoviesTypes';

export function TopProductionCountryCard({
  country,
}: Readonly<{
  country: ProductionCountryHighlight | null | undefined;
}>) {
  return (
    <details className="genre-highlight">
      <summary>
        <span className="genre-highlight-label">Pays le plus représenté</span>
        {country ? (
          <>
            <p className="genre-highlight-name">{country.name}</p>
            <p className="genre-highlight-value">
              {country.movieCount.toLocaleString('fr-FR')} <span>films</span>
            </p>
          </>
        ) : (
          <p>Aucun pays disponible.</p>
        )}
      </summary>
    </details>
  );
}
