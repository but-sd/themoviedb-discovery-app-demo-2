import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ error: '' }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: (initial: unknown) => [
    typeof initial === 'string' ? state.error : null,
    vi.fn(),
  ],
  useEffect: () => {},
}));
vi.mock(
  '../components/discovery/movie/MoviesInDatabaseCard/MoviesInDatabaseCard',
  () => ({
    MoviesInDatabaseCard: () => <div>Autonomous catalog card</div>,
  }),
);
import DataExplorationPage from './DataExplorationPage';

it.each(['', 'Other statistics unavailable'])(
  'keeps the autonomous card mounted when other statistics are pending or failed (%s)',
  (error) => {
    state.error = error;
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DataExplorationPage />
      </MemoryRouter>,
    );
    expect(markup).toContain('Autonomous catalog card');
    if (error) expect(markup).toContain('role="alert"');
    else expect(markup).toContain('Chargement de la synthèse des genres');
    expect(markup).not.toContain('Non disponible');
  },
);
