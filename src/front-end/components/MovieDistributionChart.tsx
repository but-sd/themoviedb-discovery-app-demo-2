import { useId } from 'react';
import DistributionChartVisualization from './DistributionChartVisualization';

type ChartRow = { label: string; movieCount: number };
type ChartProps = {
  title: string;
  categoryLabel: string;
  circularDescription?: string;
} & (
  | { data: ChartRow[]; metric?: 'count' }
  | { data: (ChartRow & { averageRating: number })[]; metric: 'rating' }
);

export default function MovieDistributionChart(props: ChartProps) {
  const { title, categoryLabel } = props;
  const isRating = props.metric === 'rating';
  const data =
    props.metric === 'rating'
      ? props.data.map((row) => ({ ...row, value: row.averageRating }))
      : props.data.map((row) => ({ ...row, value: row.movieCount }));
  const formatValue = (value: number) =>
    value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const titleId = useId();
  if (data.length === 0) {
    return (
      <p>
        Aucun film à afficher. Lancez une collecte pour alimenter le graphique.
      </p>
    );
  }
  return (
    <section className="genre-distribution" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <DistributionChartVisualization
        data={data}
        title={title}
        isRating={isRating}
        circularDescription={props.circularDescription}
      />
      <details>
        <summary>Afficher les données du graphique</summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{categoryLabel}</th>
              {isRating && <th scope="col">Note moyenne / 10</th>}
              <th scope="col">{isRating ? 'Films notés' : 'Films'}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ label, movieCount, value }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {isRating && <td>{formatValue(value)}</td>}
                <td>{movieCount.toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
