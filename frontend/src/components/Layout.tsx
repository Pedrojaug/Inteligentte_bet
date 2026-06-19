import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Home, Zap, User, LogOut, PlusCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <img src="/logos/bolao-logo.png" alt="Bolão Inteligentte" />
            <span>Bolão</span>
          </Link>

          <ul className="navbar-nav">
            <li>
              <Link to="/dashboard" className={isActive('/dashboard')}>
                <Home size={18} />
                Meus Bolões
              </Link>
            </li>
            <li>
              <Link to="/live" className={isActive('/live')}>
                <Zap size={18} />
                Ao Vivo
              </Link>
            </li>
            <li>
              <Link to="/create" className={isActive('/create')}>
                <PlusCircle size={18} />
                Criar Bolão
              </Link>
            </li>
          </ul>

          <div className="nav-user">
            <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
              <div className="nav-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.875rem' }}>{user?.name?.split(' ')[0]}</span>
            </Link>
            <button className="nav-link" onClick={handleLogout} title="Sair">
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button 
            className="nav-link" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none' }}
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          ⚡ Powered by <span>Inteligentte Lab</span>
        </p>
      </footer>
    </div>
  );
}
