import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import Footer from './components/Footer/Footer';
import './app.css';
import MovieDetailPage from './pages/MovieDetailPage';
import MoviesListPage from './pages/MoviesListPage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage';
import NavBar from './components/NavBar/NavBar';
import DataExplorationPage from './pages/DataExplorationPage';
import AdministrationPage from './pages/AdministrationPage';
import MovieYearDistributionPage from './pages/MovieYearDistributionPage';
import MovieRuntimeDistributionPage from './pages/MovieRuntimeDistributionPage';
import MovieRatingDistributionPage from './pages/MovieRatingDistributionPage';
import MovieCountryDistributionPage from './pages/MovieCountryDistributionPage';
import MovieGenreDistributionPage from './pages/MovieGenreDistributionPage';
import MovieGenreRatingsPage from './pages/MovieGenreRatingsPage';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <>
      <NavBar
        theme={theme}
        onToggleTheme={() =>
          setTheme((currentTheme) =>
            currentTheme === 'light' ? 'dark' : 'light',
          )
        }
      />
      <Routes>
        <Route path="/" element={<Navigate to="/movies" replace />} />
        <Route path="/movies" element={<MoviesListPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/exploration" element={<DataExplorationPage />} />
        <Route
          path="/exploration/movies/genres/ratings"
          element={<MovieGenreRatingsPage />}
        />
        <Route
          path="/exploration/movies/genres/weighted-ratings"
          element={<MovieGenreRatingsPage weighted />}
        />
        <Route
          path="/exploration/movies/genres"
          element={<MovieGenreDistributionPage />}
        />
        <Route
          path="/exploration/movies/countries"
          element={<MovieCountryDistributionPage />}
        />
        <Route
          path="/exploration/movies/ratings"
          element={<MovieRatingDistributionPage />}
        />
        <Route
          path="/exploration/movies/runtimes"
          element={<MovieRuntimeDistributionPage />}
        />
        <Route
          path="/exploration/movies/years"
          element={<MovieYearDistributionPage />}
        />
        <Route path="/administration" element={<AdministrationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </>
  );
}
