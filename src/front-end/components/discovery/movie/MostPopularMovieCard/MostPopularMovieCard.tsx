import { Link } from 'react-router';
import type { MovieHighlight } from '../../../../../back-end/schemas/MoviesTypes';

/**
 * Carte affichant le film le plus populaire.
 * @param movie Le film mis en avant ou null si indisponible.
 * @returns Un élément JSX représentant la carte du film le plus populaire.
 */
export function MostPopularMovieCard({
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
        <span className="genre-highlight-label">Film le plus populaire</span>
        {movie ? (
          <>
            <p className="genre-highlight-name">{movie.title}</p>
            <p className="featured-movie-year">
              {movie.year ?? 'Année inconnue'}
            </p>
            <p className="genre-highlight-value">
              {movie.popularity === null
                ? 'Non disponible'
                : movie.popularity.toLocaleString('fr-FR', {
                    maximumFractionDigits: 2,
                  })}{' '}
              <span>popularité</span>
            </p>
          </>
        ) : (
          <p>Aucun film disponible.</p>
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
