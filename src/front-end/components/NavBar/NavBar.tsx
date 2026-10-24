import { NavLink } from 'react-router';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import './NavBar.css';

interface NavBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function NavBar({ theme, onToggleTheme }: NavBarProps) {
  return (
    <nav className="app-nav" aria-label="Navigation principale">
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
            to="/exploration"
          >
            Exploration des données
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `app-nav-link${isActive ? ' app-nav-link-active' : ''}`
            }
            to="/about"
          >
            À propos
          </NavLink>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <NavLink
            className={({ isActive }) =>
              `app-nav-link${isActive ? ' app-nav-link-active' : ''}`
            }
            to="/administration"
          >
            Administration
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
