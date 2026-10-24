import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Page introuvable</h1>
        <p>La page demandée n’existe pas ou a été déplacée.</p>
      </header>
      <Link to="/exploration">Retour à l’exploration des données</Link>
    </main>
  );
}
