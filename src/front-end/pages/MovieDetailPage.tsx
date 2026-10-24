import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { MovieDetails } from '../../back-end/schemas/MoviesTypes';
import MovieDetailCard from '../components/MovieDetailCard';
import { fetchMovieDetails } from '../services/movies';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<{
    id: string | undefined;
    movie: MovieDetails | null;
    error: string;
  } | null>(null);
  const movie = result?.id === id ? result?.movie : null;
  const error = result?.id === id ? result?.error : '';

  useEffect(() => {
    const controller = new AbortController();
    fetchMovieDetails(id ?? '', controller.signal)
      .then((movie) => {
        if (!controller.signal.aborted) setResult({ id, movie, error: '' });
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            id,
            movie: null,
            error:
              fetchError instanceof Error
                ? fetchError.message
                : 'Impossible de charger la fiche du film.',
          });
        }
      });
    return () => controller.abort();
  }, [id]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Détails du film</h1>
        <Link className="back-link" to="/movies">
          ← Retour vers les films populaires
        </Link>
        {' · '}
        <Link className="back-link" to="/exploration">
          Exploration des données
        </Link>
      </header>
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : movie ? (
          <MovieDetailCard movie={movie} />
        ) : (
          <output className="status-message">
            Chargement de la fiche du film…
          </output>
        )}
      </section>
    </main>
  );
}
