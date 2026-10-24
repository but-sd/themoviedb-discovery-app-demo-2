import type { MovieYearDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieDistributionChart from './MovieDistributionChart';

export default function MovieYearDistributionChart({
  data,
}: {
  data: MovieYearDistribution[];
}) {
  return (
    <MovieDistributionChart
      data={data.map(({ year, movieCount }) => ({
        label: String(year),
        movieCount,
      }))}
      title="Nombre de films par année de sortie"
      categoryLabel="Année de sortie"
    />
  );
}
