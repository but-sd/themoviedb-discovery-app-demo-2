// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import NavBar from './NavBar';

afterEach(cleanup);

function renderNavBar(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>,
  );
}

describe('NavBar', () => {
  it('renders the navigation landmark, brand, and destination links', () => {
    renderNavBar('/movies');

    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).not.toBeNull();
    expect(screen.getByText('TMDB Discovery')).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Films populaires' })
        .getAttribute('href'),
    ).toBe('/movies');
    expect(
      screen.getByRole('link', { name: 'À propos' }).getAttribute('href'),
    ).toBe('/about');
  });

  it('marks Films populaires active on the movies route', () => {
    renderNavBar('/movies');

    expect(
      screen.getByRole('link', { name: 'Films populaires' }).className,
    ).toContain('app-nav-link-active');
    expect(
      screen.getByRole('link', { name: 'À propos' }).className,
    ).not.toContain('app-nav-link-active');
  });

  it('marks À propos active on the about route', () => {
    renderNavBar('/about');

    expect(
      screen.getByRole('link', { name: 'Films populaires' }).className,
    ).not.toContain('app-nav-link-active');
    expect(screen.getByRole('link', { name: 'À propos' }).className).toContain(
      'app-nav-link-active',
    );
  });
});
