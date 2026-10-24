import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { MovieRuntimeDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieRuntimeDistributionChart from '../components/MovieRuntimeDistributionChart';
import { fetchMovieRuntimeDistribution } from '../services/movie-runtime-distribution';
import './DataExplorationPage.css';

export default function MovieRuntimeDistributionPage() {
  const [data, setData] = useState<MovieRuntimeDistribution | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchMovieRuntimeDistribution(controller.signal)
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

  const content =
    data === null ? (
      <output>Chargement du graphique…</output>
    ) : (
      <MovieRuntimeDistributionChart data={data} />
    );
  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <h1>Répartition des films par durée</h1>
      <p>
        Films présents dans la base, regroupés par durée en heures. Chaque film
        est compté une seule fois. Les durées inconnues sont affichées
        séparément.
      </p>
      {error ? <p role="alert">{error}</p> : content}
    </main>
  );
}
