import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { GenreDistribution } from '../../back-end/schemas/MoviesTypes';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export default function GenreDistributionChart({
  revision,
}: {
  revision: unknown;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GenreDistribution[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/movies/genres/distribution', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Impossible de charger la répartition par genre.');
        const result: unknown = await response.json();
        if (
          !Array.isArray(result) ||
          !result.every(
            (row: unknown) =>
              typeof row === 'object' &&
              row !== null &&
              'id' in row &&
              typeof row.id === 'number' &&
              'name' in row &&
              typeof row.name === 'string' &&
              'movieCount' in row &&
              typeof row.movieCount === 'number' &&
              Number.isSafeInteger(row.movieCount) &&
              row.movieCount >= 0,
          )
        )
          throw new Error('Répartition par genre invalide.');
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
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
  }, [revision]);

  useEffect(() => {
    if (!canvas.current || !data?.length || error) return;
    const colors = getComputedStyle(document.documentElement);
    const chart = new Chart(canvas.current, {
      type: 'bar',
      data: {
        labels: data.map((genre) => genre.name),
        datasets: [
          {
            label: 'Nombre de films',
            data: data.map((genre) => genre.movieCount),
            backgroundColor: '#2789a5',
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: colors.getPropertyValue('--text-muted'),
            },
            grid: { color: colors.getPropertyValue('--line') },
          },
          y: {
            ticks: { color: colors.getPropertyValue('--text-secondary') },
            grid: { display: false },
          },
        },
      },
    });
    const observer = new MutationObserver(() => {
      const theme = getComputedStyle(document.documentElement);
      const scales = chart.options.scales;
      if (scales?.x?.ticks && scales.y?.ticks && scales.x.grid) {
        scales.x.ticks.color = theme.getPropertyValue('--text-muted');
        scales.y.ticks.color = theme.getPropertyValue('--text-secondary');
        scales.x.grid.color = theme.getPropertyValue('--line');
        chart.update();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [data, error]);

  return (
    <section className="genre-distribution" aria-labelledby="genre-chart-title">
      <h2 id="genre-chart-title">Répartition des films par genre</h2>
      <p>
        Tous les films en base. Un film peut être compté dans plusieurs genres.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : data === null ? (
        <p role="status">Chargement du graphique…</p>
      ) : data.length === 0 ? (
        <p>
          Aucun genre à afficher. Lancez une collecte pour alimenter le
          graphique.
        </p>
      ) : (
        <>
          <div style={{ height: Math.max(280, data.length * 32) }}>
            <canvas
              ref={canvas}
              role="img"
              aria-label="Nombre de films par genre, détaillé dans le tableau ci-dessous"
            />
          </div>
          <details>
            <summary>Afficher les données du graphique</summary>
            <table>
              <caption>Nombre de films par genre</caption>
              <thead>
                <tr>
                  <th scope="col">Genre</th>
                  <th scope="col">Films</th>
                </tr>
              </thead>
              <tbody>
                {data.map((genre) => (
                  <tr key={genre.id}>
                    <th scope="row">{genre.name}</th>
                    <td>{genre.movieCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
