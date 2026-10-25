import { useEffect, useState } from 'react';
import DataHighlights from '../components/DataHighlights';
import type { CollectionSummary } from '../../back-end/schemas/MoviesTypes';
import { fetchCollectionSummary } from '../services/collection';
import './DataExplorationPage.css';

export default function DataExplorationPage() {
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchCollectionSummary(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSummary(result);
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Impossible de lire les informations de la base.',
          );
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Exploration des données</h1>
        <p>Explorez les films et les tendances de votre catalogue collecté.</p>
      </header>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        !summary && <output>Chargement des informations de la base…</output>
      )}
      <DataHighlights revision={null} summary={summary} />
    </main>
  );
}
