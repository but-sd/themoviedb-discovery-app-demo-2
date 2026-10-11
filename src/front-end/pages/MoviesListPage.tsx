import { useLocation } from 'react-router';
import MovieItem from '../components/MovieItem';
import { useInfiniteMovies } from '../hooks/useInfiniteMovies';

export default function MoviesListPage() {
  const { search } = useLocation();
  const { movies, isLoading, hasMore, error, sentinelRef, loadMore } =
    useInfiniteMovies(search);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Films populaires</h1>
        <h2>
          Films tendances en France, d'après les données de{' '}
          <b>The Movie Database</b>
        </h2>
      </header>
      <section aria-label="Liste des films populaires" aria-busy={isLoading}>
        {movies.length > 0 && (
          <ul className="movie-grid">
            {movies.map((movie) => (
              <li key={movie.id}>
                <article>
                  <MovieItem movie={movie} />
                </article>
              </li>
            ))}
          </ul>
        )}
        <div ref={sentinelRef} className="movie-pagination">
          <div role="status" aria-live="polite">
            {isLoading && (
              <p className="status-message">Chargement des films...</p>
            )}
            {!isLoading && !hasMore && (
              <p className="status-message">
                {movies.length > 0
                  ? 'Tous les films disponibles ont été affichés.'
                  : 'Aucun film disponible.'}
              </p>
            )}
          </div>
          {error && (
            <p className="status-message" role="alert">
              {error}
            </p>
          )}
          {!isLoading && hasMore && (
            <button
              type="button"
              className="load-more-button"
              onClick={loadMore}
            >
              {error ? 'Réessayer' : 'Charger plus de films'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
