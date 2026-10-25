import type { MovieDetails } from '../../back-end/schemas/MoviesTypes';
import './MovieDetailCard.css';

export default function MovieDetailCard({ movie }: { movie: MovieDetails }) {
  const releaseYear = movie.release_date?.slice(0, 4) || 'Non disponible';
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
    : null;
  const rating = movie.vote_average?.toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  });

  return (
    <article className="movie-detail-card">
      <figure className="movie-detail-hero-container">
        {posterUrl ? (
          <img
            className="movie-detail-hero"
            src={posterUrl}
            alt={`Affiche de ${movie.title}`}
          />
        ) : (
          <div
            className="movie-detail-hero movie-detail-hero-placeholder"
            aria-hidden="true"
          />
        )}
      </figure>
      <div className="movie-detail-copy">
        <header>
          <p className="movie-detail-kicker">Détails du film</p>
          <h2 className="movie-detail-title">{movie.title}</h2>
          {movie.tagline && (
            <p className="movie-detail-tagline">{movie.tagline}</p>
          )}
        </header>
        <dl className="movie-detail-meta">
          <div>
            <dt>Année de sortie</dt>
            <dd>{releaseYear}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd>
              {movie.vote_count !== null &&
              movie.vote_count > 0 &&
              rating !== undefined
                ? `${rating} / 10`
                : 'Non disponible'}
            </dd>
          </div>
        </dl>
        {movie.genres.length > 0 && (
          <section className="movie-detail-section">
            <h3>Genres</h3>
            <ul className="movie-detail-genres">
              {movie.genres.map((genre) => (
                <li key={genre.id}>{genre.name}</li>
              ))}
            </ul>
          </section>
        )}
        {movie.production_countries.length > 0 && (
          <section className="movie-detail-section">
            <h3>Pays de production</h3>
            <ul className="movie-detail-countries">
              {movie.production_countries.map((country) => (
                <li key={country.iso_3166_1}>{country.name}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="movie-detail-section">
          <h3>Résumé</h3>
          <p>{movie.overview || 'Aucun résumé disponible.'}</p>
        </section>
      </div>
    </article>
  );
}
