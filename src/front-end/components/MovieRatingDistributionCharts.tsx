import type { MovieRatingDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieDistributionChart from './MovieDistributionChart';

export default function MovieRatingDistributionCharts({
  data,
}: {
  data: MovieRatingDistribution;
}) {
  const ratedCount = data.buckets.reduce(
    (total, row) => total + row.movieCount,
    0,
  );
  if (ratedCount + data.unratedMovieCount === 0) {
    return (
      <p>
        Aucun film à afficher. Lancez une collecte pour alimenter les
        graphiques.
      </p>
    );
  }
  return (
    <>
      <p>
        Films non notés : {data.unratedMovieCount.toLocaleString('fr-FR')}{' '}
        (exclus des graphiques).
      </p>
      {ratedCount === 0 ? (
        <p>Aucun film noté disponible.</p>
      ) : (
        <>
          <h2>Répartition des films par note</h2>
          <p>
            Tranches d’un point : borne inférieure incluse, borne supérieure
            exclue, sauf 10 inclus dans la dernière tranche.
          </p>
          <MovieDistributionChart
            data={data.buckets}
            title="Nombre de films par tranche de note"
            categoryLabel="Note / 10"
          />
          <h2>Note moyenne par année de sortie</h2>
          <p>
            Moyenne arithmétique des notes des films ayant au moins un vote,
            sans pondération par le nombre de votes. Échelle de 0 à 10 ; les
            années sans film noté sont omises.
          </p>
          <MovieDistributionChart
            data={data.years.map(({ year, ...row }) => ({
              ...row,
              label: String(year),
            }))}
            metric="rating"
            title="Note moyenne des films par année de sortie"
            categoryLabel="Année de sortie"
          />
        </>
      )}
    </>
  );
}
