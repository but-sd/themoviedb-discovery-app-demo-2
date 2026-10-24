import type { GenreDistribution } from '../../../back-end/schemas/MoviesTypes';
import { Link } from 'react-router';

/**
 * Card displaying how many distinct genres are represented in the catalog.
 * @param distribution Genres distribution.
 * @returns A JSX element representing represented genres card.
 */
export function RepresentedGenresCard({
  distribution,
}: Readonly<{
  distribution: GenreDistribution[];
}>) {
  return (
    <Link
      to="/exploration/movies/genres"
      className="genre-highlight featured-movie-link"
    >
      <span className="genre-highlight-label">Genres représentés</span>
      <p className="genre-highlight-name">Diversité du catalogue</p>
      <p className="genre-highlight-value">
        {distribution.length.toLocaleString('fr-FR')} <span>genres</span>
      </p>
    </Link>
  );
}
