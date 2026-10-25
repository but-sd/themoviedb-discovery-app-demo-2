import { useEffect, useState } from 'react';
import { fetchCatalogSummary } from '../../../../services/catalog-summary';
import { MoviesInDatabaseCardView } from './MoviesInDatabaseCardView';
import type { MoviesInDatabaseCardState } from './MoviesInDatabaseCardView';

export function MoviesInDatabaseCard() {
  const [state, setState] = useState<MoviesInDatabaseCardState>({
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogSummary(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
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
    return () => controller.abort();
  }, []);

  return <MoviesInDatabaseCardView state={state} />;
}
