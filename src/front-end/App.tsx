import { Navigate, Route, Routes } from 'react-router';
import Footer from './components/Footer/Footer';
import './app.css';
import MovieDetailPage from './pages/MovieDetailPage/MovieDetailPage';
import MoviesListPage from './pages/MoviesListPage/MoviesListPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import AboutPage from './pages/AboutPage/AboutPage';
import NavBar from './components/NavBar/NavBar';

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/movies" replace />} />
        <Route path="/movies" element={<MoviesListPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </>
  );
}
