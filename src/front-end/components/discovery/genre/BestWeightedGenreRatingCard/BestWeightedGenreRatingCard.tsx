import type { GenreRating } from '../../../../../back-end/schemas/MoviesTypes';
import { Link } from 'react-router';

/**
 * Card displaying the best vote-weighted genre rating.
 * @param ratings Genre ratings.
 * @returns A JSX element representing best weighted genre rating card.
 */
export function BestWeightedGenreRatingCard({
  ratings,
}: Readonly<{
  ratings: GenreRating[];
}>) {
  const maxWeightedRating = Math.max(
    ...ratings.map((genre) => genre.weightedAverageRating),
  );
  const highestWeightedRated = ratings.filter(
    (genre) => genre.weightedAverageRating === maxWeightedRating,
  );

  return (
    <Link
      to="/exploration/movies/genres/weighted-ratings"
      className="genre-highlight genre-highlight--rating featured-movie-link"
    >
      <span className="genre-highlight-label">Meilleure note pondérée</span>
      {highestWeightedRated.length ? (
        <>
          <p className="genre-highlight-name">
            {highestWeightedRated[0].name}
            {highestWeightedRated.length > 1 && (
              <span className="genre-highlight-badge">
                +{highestWeightedRated.length - 1}
              </span>
            )}
          </p>
          <p className="genre-highlight-value">
            {maxWeightedRating.toLocaleString('fr-FR', {
              maximumFractionDigits: 2,
            })}{' '}
            <span>/ 10</span>
          </p>
        </>
      ) : (
        <p>Aucun film noté disponible.</p>
      )}
    </Link>
  );
}
