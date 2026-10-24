import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { MemoryRouter, Route, Routes } from 'react-router';
import '../src/front-end/global.css';
import '../src/front-end/app.css';
import '../src/front-end/pages/DataExplorationPage.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    (Story) => (
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Story />} />
          <Route
            path="/exploration/movies/runtimes"
            element={
              <p>Répartition par durée : disponible dans l’application.</p>
            }
          />
          <Route
            path="/exploration/movies/years"
            element={
              <p>Répartition par année : disponible dans l’application.</p>
            }
          />
          <Route
            path="/movies/:id"
            element={
              <p>Fiche film : navigation disponible dans l’application.</p>
            }
          />
        </Routes>
      </MemoryRouter>
    ),
  ],
};

export default preview;
