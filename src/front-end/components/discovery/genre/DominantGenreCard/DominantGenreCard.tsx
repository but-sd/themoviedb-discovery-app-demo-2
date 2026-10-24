import type { GenreDistribution } from '../../../../../back-end/schemas/MoviesTypes';
import { Link } from 'react-router';

/**
 * Card displaying the dominant genre by number of films.
 * @param distribution Genres distribution.
 * @returns A JSX element representing dominant genre card.
 */
export function DominantGenreCard({
  distribution,
}: Readonly<{
  distribution: GenreDistribution[];
}>) {
  const maxCount = Math.max(...distribution.map((genre) => genre.movieCount));
  const mostRepresented = distribution.filter(
    (genre) => genre.movieCount === maxCount,
  );

  return (
    <Link
      to="/exploration/movies/genres"
      className="genre-highlight featured-movie-link"
    >
      <span className="genre-highlight-label">Genre dominant</span>
      {mostRepresented.length ? (
        <>
          <p className="genre-highlight-name">
            {mostRepresented[0].name}
            {mostRepresented.length > 1 && (
              <span className="genre-highlight-badge">
                +{mostRepresented.length - 1}
              </span>
            )}
          </p>
          <p className="genre-highlight-value">
            {maxCount.toLocaleString('fr-FR')} <span>films</span>
          </p>
        </>
      ) : (
        <p>Aucun genre disponible.</p>
      )}
    </Link>
  );
}
