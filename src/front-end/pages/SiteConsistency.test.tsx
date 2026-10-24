import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import DataExplorationPage from './DataExplorationPage';
import MoviesListPage from './MoviesListPage';
import MovieDetailPage from './MovieDetailPage';
import NotFoundPage from './NotFoundPage';
import AboutPage from './AboutPage';
import NavBar from '../components/NavBar/NavBar';
import MovieItem from '../components/MovieItem';
import { movieDetails } from '../stories/fixtures';

it.each([DataExplorationPage, MoviesListPage, MovieDetailPage, NotFoundPage])(
  'renders one main title and French content for %s',
  (Page) => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(markup).not.toContain('Loading...');
    expect(markup).not.toContain('Main content');
  },
);

it('keeps the exploration navigation active on nested chart pages', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter
      initialEntries={['/exploration/movies/genres/weighted-ratings']}
    >
      <NavBar theme="dark" onToggleTheme={() => {}} />
    </MemoryRouter>,
  );
  expect(markup).toContain('aria-label="Navigation principale"');
  expect(markup).toMatch(/aria-current="page"[^>]*href="\/exploration"/);
  expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
});

it('keeps missing posters aligned and distinguishes unrated films from zero scores', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MovieItem
        movie={{
          ...movieDetails,
          genre_ids: [],
          vote_count: 0,
          release_date: null,
          poster_path: null,
        }}
      />
    </MemoryRouter>,
  );
  expect(markup).toContain('movie-poster--fallback');
  expect(markup).toContain('Année inconnue');
  expect(markup).toContain('Non noté');
});

it('provides a working escape from the not-found page and the current repository URL', () => {
  expect(
    renderToStaticMarkup(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    ),
  ).toContain('href="/exploration"');
  expect(renderToStaticMarkup(<AboutPage />)).toContain(
    'href="https://github.com/but-sd/themoviedb-discovery-app-demo-2"',
  );
});

it('localizes a real zero rating without marking it as unrated', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MovieItem
        movie={{
          ...movieDetails,
          genre_ids: [],
          vote_average: 0,
          vote_count: 1,
        }}
      />
    </MemoryRouter>,
  );
  expect(markup).toContain('Note 0 / 10');
  expect(markup).not.toContain('Non noté');
});
