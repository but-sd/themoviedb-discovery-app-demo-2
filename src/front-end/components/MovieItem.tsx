import { Link } from 'react-router';
import type { Movie } from '../../back-end/schemas/MoviesTypes';

type MovieItemProps = {
  movie: Movie;
};

export default function MovieItem({ movie }: MovieItemProps) {
  const releaseYear = movie.release_date?.slice(0, 4) || 'Année inconnue';
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
    : null;
  const rating = movie.vote_average?.toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  });

  return (
    <Link to={`/movies/${movie.id}`} className="movie-card-link">
      <div className="movie-card">
        {posterUrl ? (
          <img
            className="movie-poster"
            src={posterUrl}
            alt={`Affiche de ${movie.title}`}
          />
        ) : (
          <div
            className="movie-poster movie-poster--fallback"
            aria-hidden="true"
          />
        )}
        <div className="movie-card__content">
          <h2>{movie.title}</h2>
          <p>
            {releaseYear} ·{' '}
            {movie.vote_count !== null &&
            movie.vote_count > 0 &&
            rating !== undefined
              ? `Note ${rating} / 10`
              : 'Non noté'}
          </p>
        </div>
      </div>
    </Link>
  );
}
