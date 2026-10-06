import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Navigate, Routes } from 'react-router';
import App from './App';
import Footer from './components/Footer/Footer';
import NavBar from './components/NavBar/NavBar';
import AboutPage from './pages/AboutPage/AboutPage';
import MovieDetailPage from './pages/MovieDetailPage/MovieDetailPage';
import MoviesListPage from './pages/MoviesListPage/MoviesListPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

vi.mock('./components/Footer/Footer', () => ({ default: vi.fn() }));
vi.mock('./components/NavBar/NavBar', () => ({ default: vi.fn() }));
vi.mock('./pages/AboutPage/AboutPage', () => ({ default: vi.fn() }));
vi.mock('./pages/MovieDetailPage/MovieDetailPage', () => ({
  default: vi.fn(),
}));
vi.mock('./pages/MoviesListPage/MoviesListPage', () => ({ default: vi.fn() }));
vi.mock('./pages/NotFoundPage/NotFoundPage', () => ({ default: vi.fn() }));

type RouteElementProps = {
  path?: string;
  element?: ReactNode;
};

function getAppChildren(): ReactNode[] {
  const appElement = App();

  if (!isValidElement<{ children: ReactNode }>(appElement)) {
    throw new Error('App must return a React element.');
  }

  return Children.toArray(appElement.props.children);
}

function getRouteElements(): ReactElement<RouteElementProps>[] {
  const routesElement = getAppChildren()[1] as ReactElement<{
    children: ReactNode;
  }>;

  if (routesElement.type !== Routes) {
    throw new Error(
      'App must render its routes between the shared components.',
    );
  }

  return Children.toArray(
    routesElement.props.children,
  ) as ReactElement<RouteElementProps>[];
}

describe('App', () => {
  it('redirects the root route to the movies page', () => {
    // Arrange
    const routes = getRouteElements();

    // Act
    const rootRoute = routes.find((route) => route.props.path === '/');

    // Assert: the root route replaces the current entry with /movies.
    expect(rootRoute).toBeDefined();

    const redirect = rootRoute?.props.element as ReactElement<{
      to: string;
      replace?: boolean;
    }>;

    expect(redirect.type).toBe(Navigate);
    expect(redirect.props.to).toBe('/movies');
    expect(redirect.props.replace).toBe(true);
  });

  it('maps each application route to its corresponding page', () => {
    // Arrange
    const routes = getRouteElements();
    const expectedRoutes = [
      { path: '/movies', component: MoviesListPage },
      { path: '/movies/:id', component: MovieDetailPage },
      { path: '/about', component: AboutPage },
      { path: '*', component: NotFoundPage },
    ];

    // Act
    const configuredRoutes = expectedRoutes.map(({ path }) =>
      routes.find((route) => route.props.path === path),
    );

    // Assert: each route renders its intended page component.
    expect(configuredRoutes).toHaveLength(expectedRoutes.length);

    configuredRoutes.forEach((route, index) => {
      expect(route).toBeDefined();

      const page = route?.props.element as ReactElement;
      expect(page.type).toBe(expectedRoutes[index].component);
    });
  });

  it('renders the navigation and footer around the route outlet', () => {
    // Arrange
    const appChildren = getAppChildren();

    // Act
    const childTypes = appChildren.map((child) =>
      isValidElement(child) ? child.type : undefined,
    );

    // Assert: shared navigation and footer surround the routes.
    expect(childTypes).toEqual([NavBar, Routes, Footer]);
  });
});
