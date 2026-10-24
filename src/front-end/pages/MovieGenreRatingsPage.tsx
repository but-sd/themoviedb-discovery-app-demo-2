import { Link } from 'react-router';
import GenreDistributionChart from '../components/GenreDistributionChart';
import './DataExplorationPage.css';

export default function MovieGenreRatingsPage({
  weighted = false,
}: {
  weighted?: boolean;
}) {
  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <h1>
        {weighted
          ? 'Notes moyennes pondérées par genre'
          : 'Notes moyennes par genre'}
      </h1>
      <p>
        Les genres sont classés par note décroissante, puis par identifiant en
        cas d’égalité. Les genres sans film noté sont omis. Échelle de 0 à 10.
      </p>
      <GenreDistributionChart
        key={String(weighted)}
        revision={null}
        metric={weighted ? 'weightedRating' : 'rating'}
      />
    </main>
  );
}
