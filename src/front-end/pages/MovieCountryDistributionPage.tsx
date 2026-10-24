import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { MovieCountryDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieCountryDistributionChart from '../components/MovieCountryDistributionChart';
import { fetchMovieCountryDistribution } from '../services/movie-country-distribution';
import './DataExplorationPage.css';

export default function MovieCountryDistributionPage() {
  const [data, setData] = useState<MovieCountryDistribution | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchMovieCountryDistribution(controller.signal)
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
      <MovieCountryDistributionChart data={data} />
    );
  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <header className="app-header">
        <h1>Répartition des films par pays de production</h1>
        <p>
          Tous les pays sont classés par nombre de films décroissant, puis par
          code pays en cas d’égalité. Une coproduction compte une fois pour
          chaque pays : la somme des valeurs peut dépasser le nombre de films en
          base.
        </p>
      </header>
      {error ? <p role="alert">{error}</p> : content}
    </main>
  );
}
