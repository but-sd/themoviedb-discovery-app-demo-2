import { Link } from 'react-router';

export function AverageRatingCard({
  averageRating,
}: Readonly<{
  averageRating: number | null | undefined;
}>) {
  return (
    <Link
      to="/exploration/movies/ratings"
      className="genre-highlight featured-movie-link"
    >
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
    </Link>
  );
}
