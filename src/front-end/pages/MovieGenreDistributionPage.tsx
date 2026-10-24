import { Link } from 'react-router';
import GenreDistributionChart from '../components/GenreDistributionChart';
import './DataExplorationPage.css';

export default function MovieGenreDistributionPage() {
  return (
    <main className="app-shell">
      <Link to="/exploration">Retour à l’exploration des données</Link>
      <h1>Répartition des films par genre</h1>
      <p>
        Un film peut appartenir à plusieurs genres : il compte une fois pour
        chacun de ses genres. La somme des valeurs peut donc dépasser le nombre
        de films en base.
      </p>
      <GenreDistributionChart revision={null} />
    </main>
  );
}
