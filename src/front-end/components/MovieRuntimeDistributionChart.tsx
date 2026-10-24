import type { MovieRuntimeDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieDistributionChart from './MovieDistributionChart';

export default function MovieRuntimeDistributionChart({
  data,
}: {
  data: MovieRuntimeDistribution;
}) {
  const total = data.buckets.reduce(
    (sum, bucket) => sum + bucket.movieCount,
    data.unknownMovieCount,
  );
  if (total === 0) {
    return (
      <p>
        Aucun film à afficher. Lancez une collecte pour alimenter le graphique.
      </p>
    );
  }
  return (
    <>
      <p>
        Durée inconnue : {data.unknownMovieCount.toLocaleString('fr-FR')} films
        (non inclus dans les tranches).
      </p>
      <MovieDistributionChart
        data={data.buckets}
        title="Nombre de films par tranche de durée"
        categoryLabel="Durée en heures"
      />
    </>
  );
}
