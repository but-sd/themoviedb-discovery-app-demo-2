import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TopProductionCountryCard } from './TopProductionCountryCard';

describe('TopProductionCountryCard', () => {
  it('shows the country name and localized film count without a tooltip', () => {
    const markup = renderToStaticMarkup(
      <TopProductionCountryCard
        country={{ code: 'FR', name: 'France', movieCount: 1234 }}
      />,
    );
    expect(markup).toContain('Pays le plus représenté');
    expect(markup).toContain('France');
    expect(markup).toContain('1\u202f234 <span>films</span>');
    expect(markup).not.toContain('tooltip');
  });

  it.each([null, undefined])('shows an empty state for %s', (country) => {
    const markup = renderToStaticMarkup(
      <TopProductionCountryCard country={country} />,
    );
    expect(markup).toContain('Aucun pays disponible.');
    expect(markup).not.toContain('NaN');
  });
});
