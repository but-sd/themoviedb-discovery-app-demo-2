import type { MovieCountryDistribution } from '../../back-end/schemas/MoviesTypes';
import MovieDistributionChart from './MovieDistributionChart';

export default function MovieCountryDistributionChart({
  data,
}: {
  data: MovieCountryDistribution;
}) {
  if (data.countries.length === 0 && data.unknownMovieCount === 0) {
    return (
      <p>
        Aucun film à afficher. Lancez une collecte pour alimenter le graphique.
      </p>
    );
  }
  return (
    <>
      <p>
        Films sans pays de production renseigné :{' '}
        {data.unknownMovieCount.toLocaleString('fr-FR')} (non inclus dans le
        graphique).
      </p>
      {data.countries.length ? (
        <MovieDistributionChart
          data={data.countries.map(({ code, name, movieCount }) => ({
            label: `${name} (${code})`,
            movieCount,
          }))}
          title="Nombre de films par pays de production"
          categoryLabel="Pays de production"
          circularDescription="Les parts représentent les associations film/pays, pas des films distincts. Une coproduction peut être comptée dans plusieurs pays."
        />
      ) : (
        <p>Aucun pays de production disponible.</p>
      )}
    </>
  );
}
