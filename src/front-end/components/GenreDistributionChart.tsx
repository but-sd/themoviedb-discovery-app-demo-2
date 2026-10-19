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
import type {
  GenreDistribution,
  GenreRating,
} from '../../back-end/schemas/MoviesTypes';

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
  metric = 'count',
}: {
  revision: unknown;
  metric?: 'count' | 'rating';
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<
    (GenreDistribution & Partial<GenreRating>)[] | null
  >(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<ChartView>('horizontal');
  const isCircular = view === 'doughnut' || view === 'pie';
  const isRating = metric === 'rating';
  const title = isRating
    ? 'Notes moyennes par genre'
    : 'Répartition des films par genre';
  const titleId = isRating ? 'genre-rating-title' : 'genre-chart-title';

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/movies/genres/${isRating ? 'ratings' : 'distribution'}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Impossible de charger : ${title}.`);
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
              row.movieCount >= 0 &&
              (!isRating ||
                ('averageRating' in row &&
                  typeof row.averageRating === 'number' &&
                  Number.isFinite(row.averageRating) &&
                  row.averageRating >= 0 &&
                  row.averageRating <= 10 &&
                  'voteCount' in row &&
                  typeof row.voteCount === 'number' &&
                  Number.isSafeInteger(row.voteCount) &&
                  row.voteCount >= 0)),
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
  }, [revision, isRating, title]);

  useEffect(() => {
    if (!canvas.current || !data?.length || error) return;
    const colors = getComputedStyle(document.documentElement);
    const chart = new Chart(canvas.current, {
      type: isCircular ? view : 'bar',
      data: {
        labels: data.map((genre) => genre.name),
        datasets: [
          {
            label: isRating ? 'Note moyenne / 10' : 'Nombre de films',
            data: data.map((genre) =>
              isRating ? (genre.averageRating ?? 0) : genre.movieCount,
            ),
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
                max: isRating && view === 'horizontal' ? 10 : undefined,
                ticks: {
                  precision: 0,
                  color: colors.getPropertyValue('--text-muted'),
                },
                grid: { color: colors.getPropertyValue('--line') },
              },
              y: {
                beginAtZero: true,
                max: isRating && view === 'vertical' ? 10 : undefined,
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
  }, [data, error, view, isCircular, isRating]);

  return (
    <section className="genre-distribution" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <p>
        Tous les films en base. Un film peut être compté dans plusieurs genres.
      </p>
      {isRating && (
        <p>
          Moyenne arithmétique des notes des films ayant au moins un vote, sans
          pondération par le nombre de votes.
        </p>
      )}
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
          {chartViews
            .filter(
              (item) =>
                !isRating ||
                item.value === 'horizontal' ||
                item.value === 'vertical',
            )
            .map((item) => (
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
              aria-label={`${title}, détaillé dans le tableau ci-dessous`}
            />
          </div>
          <details>
            <summary>Afficher les données du graphique</summary>
            <table>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Genre</th>
                  <th scope="col">Films</th>
                  {isRating && (
                    <>
                      <th scope="col">Note moyenne / 10</th>
                      <th scope="col">Votes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((genre) => (
                  <tr key={genre.id}>
                    <th scope="row">{genre.name}</th>
                    <td>{genre.movieCount}</td>
                    {isRating && (
                      <>
                        <td>
                          {genre.averageRating?.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td>{genre.voteCount?.toLocaleString('fr-FR')}</td>
                      </>
                    )}
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
