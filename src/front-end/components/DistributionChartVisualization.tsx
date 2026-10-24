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

export default function DistributionChartVisualization({
  data,
  title,
  isRating = false,
  circularDescription,
}: {
  data: { label: string; value: number }[] | null;
  title: string;
  isRating?: boolean;
  circularDescription?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<ChartView>('horizontal');
  const isCircular = !isRating && (view === 'doughnut' || view === 'pie');
  const hasValues = data?.some((row) => row.value > 0);

  useEffect(() => {
    if (!canvas.current || !data?.length || (isCircular && !hasValues)) return;
    const colors = getComputedStyle(document.documentElement);
    const chart = new Chart(canvas.current, {
      type: isCircular ? view : 'bar',
      data: {
        labels: data.map((row) => row.label),
        datasets: [
          {
            label: isRating ? 'Note moyenne / 10' : 'Nombre de films',
            data: data.map((row) => row.value),
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
      if (legend?.labels)
        legend.labels.color = theme.getPropertyValue('--text-secondary');
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
  }, [data, view, isCircular, isRating, hasValues]);

  return (
    <>
      <label className="genre-chart-selector">
        Type de graphique
        <select
          value={view}
          onChange={(event) => {
            const selected = chartViews.find(
              (item) => item.value === event.target.value,
            );
            if (
              selected &&
              (!isRating ||
                selected.value === 'horizontal' ||
                selected.value === 'vertical')
            ) {
              setView(selected.value);
            }
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
      {isCircular && circularDescription && <p>{circularDescription}</p>}
      {data !== null &&
        data.length > 0 &&
        (isCircular && !hasValues ? (
          <p>
            Aucune valeur positive à représenter dans ce graphique. Consultez le
            tableau des données.
          </p>
        ) : (
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
        ))}
    </>
  );
}
