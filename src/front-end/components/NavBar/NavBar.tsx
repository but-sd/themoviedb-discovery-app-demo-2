import { NavLink } from 'react-router';
import './NavBar.css';

export default function NavBar() {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <div className="app-nav-shell">
        <p className="app-nav-brand">TMDB Discovery</p>

        <div className="app-nav-links">
          <NavLink
            className={({ isActive }) =>
              `app-nav-link${isActive ? ' app-nav-link-active' : ''}`
            }
            to="/movies"
          >
            Films populaires
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `app-nav-link${isActive ? ' app-nav-link-active' : ''}`
            }
            to="/about"
          >
            À propos
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
