import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import type { CollectionSummary } from '../../back-end/schemas/MoviesTypes';
import './DataExplorationPage.css';

export default function DataExplorationPage() {
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(String(currentYear));
  const [endYear, setEndYear] = useState(String(currentYear));
  const [isCollecting, setIsCollecting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const collecting = useRef(false);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  function refreshSummary() {
    return fetch('/api/movies/collection')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Impossible de lire les informations de la base.');
        }
        const data: unknown = await response.json();
        if (
          typeof data !== 'object' ||
          data === null ||
          !('movieCount' in data) ||
          typeof data.movieCount !== 'number' ||
          !Number.isSafeInteger(data.movieCount) ||
          data.movieCount < 0 ||
          !('years' in data) ||
          !Array.isArray(data.years) ||
          !data.years.every(
            (year: unknown) =>
              typeof year === 'number' && Number.isInteger(year),
          )
        ) {
          throw new Error('Les informations de la base sont invalides.');
        }
        setSummary({ movieCount: data.movieCount, years: data.years });
        setSummaryError('');
      })
      .catch((summaryFetchError: unknown) => {
        setSummary(null);
        setSummaryError(
          summaryFetchError instanceof Error
            ? summaryFetchError.message
            : 'Impossible de lire les informations de la base.',
        );
      })
      .finally(() => {
        setIsLoadingSummary(false);
      });
  }

  useEffect(() => {
    void refreshSummary();
  }, []);

  async function handleCollect(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (collecting.current) return;
    setError('');
    setStatus('');
    const start = Number(startYear);
    const end = Number(endYear);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1870 ||
      end > currentYear ||
      start > end
    ) {
      setError(
        'Indiquez une période valide, de 1870 à l’année courante, avec le début antérieur ou égal à la fin.',
      );
      return;
    }
    collecting.current = true;
    setIsCollecting(true);
    let total = 0;
    let completed = 0;
    try {
      for (let year = start; year <= end; year++) {
        setStatus(
          `Collecte de ${year} en cours… ${completed} année(s) terminée(s).`,
        );
        const response = await fetch(`/api/movies/collect?year=${year}`, {
          method: 'POST',
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data === 'object' &&
              data !== null &&
              'error' in data &&
              typeof data.error === 'string'
              ? data.error
              : `La collecte de ${year} a échoué (${response.status}).`,
          );
        }
        if (
          typeof data !== 'object' ||
          data === null ||
          !('collected' in data) ||
          typeof data.collected !== 'number' ||
          !Number.isSafeInteger(data.collected) ||
          data.collected < 0
        ) {
          throw new Error(`Réponse de collecte invalide pour ${year}.`);
        }
        total += data.collected;
        completed++;
      }
      setStatus(
        `Collecte terminée : ${total} film(s) enregistré(s) sur ${completed} année(s).`,
      );
    } catch (collectionError) {
      setStatus(
        `${completed} année(s) terminée(s), ${total} film(s) enregistré(s).`,
      );
      setError(
        `${collectionError instanceof Error ? collectionError.message : 'La collecte a échoué.'} Les données déjà enregistrées sont conservées.`,
      );
    } finally {
      await refreshSummary();
      collecting.current = false;
      setIsCollecting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Exploration des données</h1>
        <h2>
          Explorez les tendances des films populaires et comparez leurs
          caractéristiques.
        </h2>
      </header>
      <form
        className="collection-form"
        onSubmit={handleCollect}
        aria-label="Collecte des données"
      >
        {isLoadingSummary ? (
          <p role="status">Chargement des informations de la base…</p>
        ) : (
          summary && (
            <div aria-label="État de la base">
              <p>
                <strong>{summary.movieCount.toLocaleString('fr-FR')}</strong>{' '}
                film(s) en base.
              </p>
              {summary.movieCount === 0 && <p>La base est vide.</p>}
              {summary.years.length > 0 && (
                <p>Années déjà collectées : {summary.years.join(', ')}.</p>
              )}
            </div>
          )
        )}
        {summaryError && (
          <div role="alert">
            <p>{summaryError}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoadingSummary(true);
                setSummaryError('');
                void refreshSummary();
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        <p>Collectez jusqu’à 100 films par année, bornes incluses.</p>
        <div className="collection-fields">
          <label>
            Année de début
            <input
              type="number"
              required
              min="1870"
              max={currentYear}
              step="1"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              disabled={isCollecting}
            />
          </label>
          <label>
            Année de fin
            <input
              type="number"
              required
              min="1870"
              max={currentYear}
              step="1"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              disabled={isCollecting}
            />
          </label>
          <button
            type="submit"
            disabled={isCollecting || isLoadingSummary || summary === null}
          >
            {isCollecting
              ? 'Collecte en cours…'
              : summary === null
                ? 'Chargement…'
                : summary.movieCount === 0
                  ? 'Instancier'
                  : 'Mettre à jour'}
          </button>
        </div>
        <p role="status">{status}</p>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
