import { useId } from 'react';
import type { MovieYearDistribution } from '../../back-end/schemas/MoviesTypes';
import './MovieYearDistributionChart.css';

export default function MovieYearDistributionChart({
  data,
}: {
  data: MovieYearDistribution[];
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
  const maximum = Math.max(...data.map((row) => row.movieCount));
  const width = Math.max(640, data.length * 56 + 64);
  const step = (width - 64) / data.length;

  return (
    <section className="genre-distribution" aria-label="Répartition par année">
      <div
        className="movie-year-chart-scroll"
        role="region"
        aria-label="Histogramme défilant par année de sortie"
        tabIndex={0}
      >
        <svg
          width={width}
          height={340}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <title id={titleId}>Nombre de films par année de sortie</title>
          <desc id={descriptionId}>
            Chaque barre indique le nombre de films d’une année. Les valeurs
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
            {data.map(({ year, movieCount }, index) => {
              const height = (movieCount / maximum) * 240;
              const x = 32 + index * step;
              return (
                <g key={year}>
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
                    {year}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <table>
        <caption>Nombre de films par année de sortie</caption>
        <thead>
          <tr>
            <th scope="col">Année de sortie</th>
            <th scope="col">Films</th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ year, movieCount }) => (
            <tr key={year}>
              <th scope="row">{year}</th>
              <td>{movieCount.toLocaleString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
