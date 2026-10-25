import { useEffect, useState } from 'react';
import { fetchCatalogSummary } from '../../../../services/catalog-summary';
import { MoviesInDatabaseCardView } from './MoviesInDatabaseCardView';
import type { MoviesInDatabaseCardState } from './MoviesInDatabaseCardView';

/**
 * Fetches the catalog summary and manages the loading, success, and error states for the MoviesInDatabaseCardView component.
 * @returns The MoviesInDatabaseCardView component with the current state
 */
export function MoviesInDatabaseCard() {
  const [state, setState] = useState<MoviesInDatabaseCardState>({
    status: 'loading',
  });

  useEffect(() => {
    let active = true;
    fetchCatalogSummary()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (active) {
          console.error(
            'Impossible de charger les informations du catalogue :',
            error,
          );
          setState({
            status: 'error',
            message: 'Chargement impossible.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return <MoviesInDatabaseCardView state={state} />;
}
