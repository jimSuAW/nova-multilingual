import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Home } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            🌍 Nova 翻譯管理
          </Link>
        </div>
        
        <ul className="navbar-nav">
          <li>
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <Home size={16} />
              儀表板
            </Link>
          </li>
          <li>
            <Link 
              to="/languages" 
              className={`nav-link ${location.pathname === '/languages' ? 'active' : ''}`}
            >
              <Globe size={16} />
              語系管理
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar; 