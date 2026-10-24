import { Link } from 'react-router';

/**
 * Carte affichant le nombre de films dans la base de données et la plage d'années présentes.
 * @param movieCount Le nombre de films dans la base de données.
 * @param years Le tableau des années présentes en base.
 * @returns Un élément JSX représentant la carte des films en base.
 */
export function MoviesInDatabaseCard({
  movieCount,
  years,
}: Readonly<{
  movieCount: number;
  years: number[];
}>) {
  return (
    <Link
      to="/exploration/movies/years"
      className="genre-highlight featured-movie-link"
    >
      <span className="genre-highlight-label">Films en base</span>
      <p className="genre-highlight-value">
        {movieCount.toLocaleString('fr-FR')} <span>films</span>
      </p>
      <p className="genre-highlight-period">
        {years.length
          ? `${Math.min(...years)} – ${Math.max(...years)}`
          : 'Aucune année présente'}
      </p>
    </Link>
  );
}
