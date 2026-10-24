import { useId } from 'react';
import './MovieYearDistributionChart.css';

export default function MovieDistributionChart({
  data,
  title,
  categoryLabel,
}: {
  data: { label: string; movieCount: number }[];
  title: string;
  categoryLabel: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  if (data.length === 0) {
    return (
      <p>
        Aucun film à afficher. Lancez une collecte pour alimenter le graphique.
      </p>
    );
  }
  const maximum = Math.max(1, ...data.map((row) => row.movieCount));
  const stepWidth = Math.max(
    56,
    ...data.map((row) => row.label.length * 8 + 16),
  );
  const width = Math.max(640, data.length * stepWidth + 64);
  const step = (width - 64) / data.length;

  return (
    <section className="genre-distribution" aria-label={title}>
      <div
        className="movie-year-chart-scroll"
        role="region"
        aria-label={`Histogramme défilant : ${title}`}
        tabIndex={0}
      >
        <svg
          width={width}
          height={340}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>
            Chaque barre indique le nombre de films d’une catégorie. Les valeurs
            exactes figurent dans le tableau ci-dessous.
          </desc>
          <g aria-hidden="true">
            <line
              x1={32}
              x2={width - 32}
              y1={290}
              y2={290}
              stroke="currentColor"
            />
            {data.map(({ label, movieCount }, index) => {
              const height = (movieCount / maximum) * 240;
              const x = 32 + index * step;
              return (
                <g key={label}>
                  <rect
                    x={x + step * 0.15}
                    y={290 - height}
                    width={step * 0.7}
                    height={height}
                    fill="var(--accent)"
                  />
                  <text
                    x={x + step / 2}
                    y={280 - height}
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {movieCount.toLocaleString('fr-FR')}
                  </text>
                  <text
                    x={x + step / 2}
                    y={315}
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryLabel}</th>
            <th scope="col">Films</th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ label, movieCount }) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{movieCount.toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
