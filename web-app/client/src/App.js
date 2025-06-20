import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import './App.css';

import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LanguageManager from './components/LanguageManager';
import TranslationEditor from './components/TranslationEditor';

// 設定 API 基礎 URL
if (process.env.NODE_ENV === 'production') {
  // 生產環境使用相對路徑（同域名）
  axios.defaults.baseURL = '';
} else {
  // 開發環境使用 localhost
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
}

function App() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/languages');
      setLanguages(response.data);
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" />
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                languages={languages} 
                onLanguageUpdate={fetchLanguages}
              />
            } 
          />
          <Route 
            path="/languages" 
            element={
              <LanguageManager 
                languages={languages} 
                onLanguageUpdate={fetchLanguages}
              />
            } 
          />
          <Route 
            path="/editor/:language/:filename" 
            element={
              <TranslationEditor 
                languages={languages}
                onLanguageUpdate={fetchLanguages}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 