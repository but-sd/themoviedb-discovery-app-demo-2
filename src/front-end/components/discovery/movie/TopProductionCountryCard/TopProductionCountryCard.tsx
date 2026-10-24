import { Link } from 'react-router';
import type { ProductionCountryHighlight } from '../../../../../back-end/schemas/MoviesTypes';

/**
 * Carte affichant le pays de production le plus représenté dans la base de données.
 * @param country Le pays de production le plus représenté, ou null si aucun pays n'est disponible.
 * @returns Un élément JSX représentant la carte du pays de production le plus représenté.
 */
export function TopProductionCountryCard({
  country,
}: Readonly<{
  country: ProductionCountryHighlight | null | undefined;
}>) {
  return (
    <Link
      to="/exploration/movies/countries"
      className="genre-highlight featured-movie-link"
    >
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
    </Link>
  );
}
