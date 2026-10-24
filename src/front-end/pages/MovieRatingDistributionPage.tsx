import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { MovieRatingDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieRatingDistributionCharts from '../components/MovieRatingDistributionCharts';
import { fetchMovieRatingDistribution } from '../services/movie-rating-distribution';
import './DataExplorationPage.css';

export default function MovieRatingDistributionPage() {
  const [data, setData] = useState<MovieRatingDistribution | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchMovieRatingDistribution(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Impossible de charger les graphiques.',
          );
        }
      });
    return () => controller.abort();
  }, []);

  const content =
    data === null ? (
      <output>Chargement des graphiques…</output>
    ) : (
      <MovieRatingDistributionCharts data={data} />
    );
  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <h1>Exploration des notes des films</h1>
      <p>
        Répartition des films en base par note et évolution de leur note moyenne
        selon l’année de sortie.
      </p>
      {error ? <p role="alert">{error}</p> : content}
    </main>
  );
}
