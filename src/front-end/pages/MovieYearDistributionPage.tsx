import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { MovieYearDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieYearDistributionChart from '../components/MovieYearDistributionChart';
import { fetchMovieYearDistribution } from '../services/movie-year-distribution';
import './DataExplorationPage.css';

export default function MovieYearDistributionPage() {
  const [data, setData] = useState<MovieYearDistribution[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchMovieYearDistribution(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Impossible de charger le graphique.',
          );
        }
      });
    return () => controller.abort();
  }, []);

  const distributionContent =
    data === null ? (
      <output>Chargement du graphique…</output>
    ) : (
      <MovieYearDistributionChart data={data} />
    );

  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <header className="app-header">
        <h1>Répartition des films par année de sortie</h1>
        <p>
          Films présents dans la base, regroupés par année de sortie. Chaque
          film est compté une seule fois ; les années sans film ne sont pas
          affichées.
        </p>
      </header>
      {error ? <p role="alert">{error}</p> : distributionContent}
    </main>
  );
}
