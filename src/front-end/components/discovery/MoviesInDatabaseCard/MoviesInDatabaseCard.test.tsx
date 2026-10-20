import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard';

describe('MoviesInDatabaseCard', () => {
  it('shows movie count and year range bounds', () => {
    const markup = renderToStaticMarkup(
      <MoviesInDatabaseCard movieCount={1234} years={[2024, 2020, 2022]} />,
    );

    expect(markup).toContain('Films en base');
    expect(markup).toContain('1\u202f234 <span>films</span>');
    expect(markup).toContain('2020 – 2024');
  });

  it('shows empty years state', () => {
    const markup = renderToStaticMarkup(
      <MoviesInDatabaseCard movieCount={0} years={[]} />,
    );

    expect(markup).toContain('0 <span>films</span>');
    expect(markup).toContain('Aucune année collectée');
  });
});
