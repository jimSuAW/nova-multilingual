import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Home } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          🌍 翻譯管理系統
        </Link>
        
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