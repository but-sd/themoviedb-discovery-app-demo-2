import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  ArcElement,
  DoughnutController,
  PieController,
  Legend,
} from 'chart.js';
import type { GenreDistribution } from '../../back-end/schemas/MoviesTypes';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  ArcElement,
  DoughnutController,
  PieController,
  Legend,
);

type ChartView = 'horizontal' | 'vertical' | 'doughnut' | 'pie';

const chartViews: { value: ChartView; label: string }[] = [
  { value: 'horizontal', label: 'Barres horizontales' },
  { value: 'vertical', label: 'Barres verticales' },
  { value: 'doughnut', label: 'Anneau' },
  { value: 'pie', label: 'Camembert' },
];

export default function GenreDistributionChart({
  revision,
}: {
  revision: unknown;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GenreDistribution[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<ChartView>('horizontal');
  const isCircular = view === 'doughnut' || view === 'pie';

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
      type: isCircular ? view : 'bar',
      data: {
        labels: data.map((genre) => genre.name),
        datasets: [
          {
            label: 'Nombre de films',
            data: data.map((genre) => genre.movieCount),
            backgroundColor: data.map(
              (_, index) => `hsl(${(index * 137.508 + 190) % 360}, 60%, 48%)`,
            ),
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: view === 'horizontal' ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isCircular,
            position: 'bottom',
            labels: { color: colors.getPropertyValue('--text-secondary') },
          },
        },
        scales: isCircular
          ? {}
          : {
              x: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                  color: colors.getPropertyValue('--text-muted'),
                },
                grid: { color: colors.getPropertyValue('--line') },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                  color: colors.getPropertyValue('--text-secondary'),
                },
                grid: { display: false },
              },
            },
      },
    });
    const observer = new MutationObserver(() => {
      const theme = getComputedStyle(document.documentElement);
      const scales = chart.options.scales;
      const legend = chart.options.plugins?.legend;
      if (legend?.labels) {
        legend.labels.color = theme.getPropertyValue('--text-secondary');
      }
      if (scales?.x?.ticks && scales.y?.ticks && scales.x.grid) {
        scales.x.ticks.color = theme.getPropertyValue('--text-muted');
        scales.y.ticks.color = theme.getPropertyValue('--text-secondary');
        scales.x.grid.color = theme.getPropertyValue('--line');
      }
      chart.update();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [data, error, view, isCircular]);

  return (
    <section className="genre-distribution" aria-labelledby="genre-chart-title">
      <h2 id="genre-chart-title">Répartition des films par genre</h2>
      <p>
        Tous les films en base. Un film peut être compté dans plusieurs genres.
      </p>
      <label className="genre-chart-selector">
        Type de graphique
        <select
          value={view}
          onChange={(event) => {
            const selected = chartViews.find(
              (item) => item.value === event.target.value,
            );
            if (selected) setView(selected.value);
          }}
        >
          {chartViews.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {isCircular && (
        <p>
          Les parts représentent les associations film/genre, pas des films
          distincts.
        </p>
      )}
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
          <div
            style={{
              height:
                view === 'horizontal' ? Math.max(280, data.length * 32) : 480,
            }}
          >
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
