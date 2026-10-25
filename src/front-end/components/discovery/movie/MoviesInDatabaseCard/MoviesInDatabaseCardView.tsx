import { Link } from 'react-router';
import type { CatalogSummary } from '../../../../../back-end/schemas/MoviesTypes';

/**
 * Component that displays the state of movies in the database, including loading, error, and success states.
 */
export type MoviesInDatabaseCardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CatalogSummary };

/**
 * Component that renders the view for the movies in the database card.
 * @param param0 The props object containing the state of the movies in the database.
 * @returns The JSX element representing the movies in the database card view.
 */
export function MoviesInDatabaseCardView({
  state,
}: {
  readonly state: MoviesInDatabaseCardState;
}) {
  if (state.status !== 'success') {
    return (
      // Display loading or error state before showing the success view
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
    // Display the success view for the movies in the database when the data is available
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
