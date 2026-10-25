import { Link } from 'react-router';
import type { CatalogSummary } from '../../../../../back-end/schemas/MoviesTypes';

export type MoviesInDatabaseCardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CatalogSummary };

export function MoviesInDatabaseCardView({
  state,
}: {
  readonly state: MoviesInDatabaseCardState;
}) {
  if (state.status !== 'success') {
    return (
      <div className="genre-highlight">
        <span className="genre-highlight-label">Films en base</span>
        {state.status === 'loading' ? (
          <output>Chargement…</output>
        ) : (
          <p role="alert">{state.message}</p>
        )}
      </div>
    );
  }
  const { movieCount, years } = state.data;
  return (
    <Link
      to="/exploration/movies/years"
      className="genre-highlight featured-movie-link"
    >
      <span className="genre-highlight-label">Films en base</span>
      <p className="genre-highlight-value">
        {movieCount.toLocaleString('fr-FR')} <span>films</span>
      </p>
      <p className="genre-highlight-period">
        {years.length
          ? `${Math.min(...years)} – ${Math.max(...years)}`
          : 'Aucune année présente'}
      </p>
    </Link>
  );
}
