import type { FinancialMovieHighlight } from '../../../back-end/schemas/MoviesTypes';

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
  return (
    <details className="genre-highlight featured-movie">
      <summary>
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
          <span className="genre-highlight-label">
            Film le plus rentable
            <span aria-hidden="true">↗</span>
          </span>
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
      </summary>
    </details>
  );
}
