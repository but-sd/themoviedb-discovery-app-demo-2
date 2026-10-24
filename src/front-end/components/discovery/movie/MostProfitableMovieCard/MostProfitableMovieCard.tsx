import { Link } from 'react-router';
import type { FinancialMovieHighlight } from '../../../../../back-end/schemas/MoviesTypes';

/**
 * Card displaying the most profitable movie by ROI.
 * @param movie The highlighted movie or null when unavailable.
 * @returns A JSX element representing the most profitable movie card.
 */
export function MostProfitableMovieCard({
  movie,
}: Readonly<{
  movie: FinancialMovieHighlight | null | undefined;
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
        <span className="genre-highlight-label">Film le plus rentable</span>
        {movie ? (
          <>
            <p className="genre-highlight-name">{movie.title}</p>
            <p className="featured-movie-year">{movie.year}</p>
            <p className="genre-highlight-value">
              {movie.returnOnInvestment.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
              })}{' '}
              <span>% ROI</span>
            </p>
          </>
        ) : (
          <p>Aucun film avec budget et recettes connus.</p>
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
