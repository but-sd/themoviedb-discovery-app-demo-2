import { Link } from 'react-router';
import type { MovieHighlight } from '../../../../../back-end/schemas/MoviesTypes';

/**
 * Card displaying the best-rated movie.
 * @param movie The highlighted movie or null when unavailable.
 * @returns A JSX element representing the best-rated movie card.
 */
export function BestRatedMovieCard({
  movie,
}: Readonly<{
  movie: MovieHighlight | null | undefined;
}>) {
  const content = (
    <div className="featured-movie-layout">
      {movie?.posterPath ? (
        <>
          <img
            className="featured-movie-poster"
            src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
          <span
            className="featured-movie-placeholder featured-movie-image-fallback"
            aria-hidden="true"
          >
            ▤
          </span>
        </>
      ) : (
        <span className="featured-movie-placeholder" aria-hidden="true">
          ▤
        </span>
      )}
      <div className="featured-movie-content">
        <span className="genre-highlight-label">Film le mieux noté</span>
        {movie ? (
          <>
            <p className="genre-highlight-name">{movie.title}</p>
            <p className="featured-movie-year">{movie.year}</p>
            <p className="genre-highlight-value">
              {movie.rating.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
              })}{' '}
              <span>/ 10</span>
            </p>
          </>
        ) : (
          <p>Aucun film avec au moins 100 votes.</p>
        )}
      </div>
    </div>
  );
  return movie ? (
    <Link
      to={`/movies/${movie.id}`}
      className="genre-highlight featured-movie featured-movie-link"
    >
      {content}
    </Link>
  ) : (
    <div className="genre-highlight featured-movie">{content}</div>
  );
}
