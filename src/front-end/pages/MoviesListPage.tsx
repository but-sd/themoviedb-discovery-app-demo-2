import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import MovieItem from '../components/MovieItem';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_PAGE,
  DEFAULT_REGION,
} from '../../back-end/constants';
import type { Movie } from '../../back-end/schemas/MoviesTypes';
import { fetchPopularMovies } from '../services/movies';

export default function MoviesListPage() {
  const [result, setResult] = useState<{
    query: string;
    movies: Movie[] | null;
    error: string;
  } | null>(null);
  const [searchParams] = useSearchParams();
  const query = new URLSearchParams({
    language: searchParams.get('language') || DEFAULT_LANGUAGE,
    page: searchParams.get('page') || DEFAULT_PAGE,
    region: searchParams.get('region') || DEFAULT_REGION,
  }).toString();
  const movies = result?.query === query ? result.movies : null;
  const error = result?.query === query ? result.error : '';

  useEffect(() => {
    const controller = new AbortController();
    fetchPopularMovies(new URLSearchParams(query), controller.signal)
      .then((movies) => {
        if (!controller.signal.aborted) setResult({ query, movies, error: '' });
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            query,
            movies: null,
            error:
              fetchError instanceof Error
                ? fetchError.message
                : 'Impossible de charger les films populaires.',
          });
        }
      });
    return () => controller.abort();
  }, [query]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Films populaires</h1>
        <p>
          Films populaires selon la région sélectionnée, d'après les données de{' '}
          <b>The Movie Database</b>
        </p>
      </header>
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : movies === null ? (
          <output className="status-message">Chargement des films…</output>
        ) : movies.length === 0 ? (
          <p>Aucun film disponible.</p>
        ) : (
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
      </section>
    </main>
  );
}
