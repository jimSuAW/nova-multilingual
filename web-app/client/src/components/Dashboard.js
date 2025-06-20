import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Globe, FileText, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import AddLanguageModal from './AddLanguageModal';

const Dashboard = ({ languages, onLanguageUpdate }) => {
  const [stats, setStats] = useState({
    totalLanguages: 0,
    totalFiles: 0,
    totalKeys: 0,
    averageCompletion: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [languages]);

  const calculateStats = async () => {
    const totalLanguages = languages.length;
    const totalFiles = languages.reduce((sum, lang) => sum + lang.fileCount, 0);
    
    // 從 API 獲取所有語系的統計數據
    let totalKeys = 0;
    let totalCompletion = 0;
    let validLanguages = 0;
    
    for (const language of languages) {
      try {
        const response = await axios.get(`/api/languages/${language.code}/stats`);
        const stats = response.data;
        totalKeys += stats.total;
        totalCompletion += stats.percentage;
        validLanguages++;
      } catch (error) {
        console.error(`Error fetching stats for ${language.code}:`, error);
      }
    }
    
    const averageCompletion = validLanguages > 0 ? Math.round(totalCompletion / validLanguages) : 0;
    
    setStats({
      totalLanguages,
      totalFiles,
      totalKeys,
      averageCompletion
    });
  };

  const handleAddLanguage = async (languageCode) => {
    try {
      setLoading(true);
      toast.loading('正在創建語系...');
      
      await axios.post('/api/languages', { languageCode });
      
      toast.dismiss();
      toast.success(`語系 ${languageCode} 創建成功！`);
      
      setShowAddModal(false);
      onLanguageUpdate();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.error || '創建語系失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const selectedLanguages = languages.map(lang => lang.code);
      
      if (selectedLanguages.length === 0) {
        toast.error('請選擇要匯出的語系');
        return;
      }
      
      toast.loading('正在匯出翻譯包...');
      
      const response = await axios.post('/api/export', {
        languages: selectedLanguages
      });
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success('翻譯包匯出成功！');
        console.log('Export path:', response.data.exportPath);
        
        // 提供下載連結
        const downloadLink = document.createElement('a');
        downloadLink.href = `/api/download-export?path=${encodeURIComponent(response.data.exportPath)}`;
        downloadLink.download = `translations-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Export error:', error);
      toast.error(error.response?.data?.error || '匯出失敗');
    }
  };

  return (
    <div>
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">翻譯管理系統</h1>
          <p className="page-subtitle">管理您的多語系翻譯文件</p>
        </div>

        {/* 統計卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalLanguages}</div>
            <div className="stat-label">語系數量</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalFiles}</div>
            <div className="stat-label">翻譯文件</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalKeys}</div>
            <div className="stat-label">翻譯鍵值</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.averageCompletion}%</div>
            <div className="stat-label">平均完成度</div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="action-buttons">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
          >
            <Plus size={16} />
            新增語系
          </button>
          
          <button 
            className="btn btn-success"
            onClick={handleExport}
            disabled={languages.length === 0}
          >
            <Download size={16} />
            匯出翻譯包
          </button>
          
          <Link to="/languages" className="btn btn-secondary">
            <Globe size={16} />
            管理語系
          </Link>
        </div>

        {/* 語系卡片 */}
        {languages.length > 0 ? (
          <div className="language-grid">
            {languages.map((language) => (
              <LanguageCard 
                key={language.code} 
                language={language}
                onLanguageUpdate={onLanguageUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">Globe</div>
            <h2 className="empty-state-title">還沒有語系</h2>
            <p className="empty-state-description">
              開始新增您的第一個語系來管理翻譯
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              新增語系
            </button>
          </div>
        )}
      </div>

      {/* 新增語系模態框 */}
      {showAddModal && (
        <AddLanguageModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddLanguage}
          loading={loading}
          existingLanguages={languages.map(lang => lang.code)}
        />
      )}
    </div>
  );
};

// 語系卡片組件
const LanguageCard = ({ language, onLanguageUpdate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguageStats();
  }, [language.code]);

  const fetchLanguageStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/languages/${language.code}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching language stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`確定要刪除語系 ${language.name} 嗎？`)) {
      return;
    }

    try {
      await axios.delete(`/api/languages/${language.code}`);
      toast.success(`語系 ${language.name} 已刪除`);
      onLanguageUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || '刪除失敗');
    }
  };

  return (
    <div className="language-card">
      <div className="language-card-header">
        <div className="language-name">{language.name}</div>
        <div className="language-code">{language.code}</div>
      </div>
      
      <div className="language-card-body">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : stats ? (
          <>
            <div className="language-stats">
              <span>文件: {language.fileCount}</span>
              <span>鍵值: {stats.total}</span>
            </div>
            
            <div className="progress-container">
              <div className="progress-label">
                <span className="progress-text">翻譯進度</span>
                <span className="progress-percentage">{stats.percentage}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="language-actions">
              <Link 
                to={`/languages`}
                className="btn btn-primary"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              >
                <FileText size={16} />
                編輯
              </Link>
              
              {!language.isBase && (
                <button 
                  className="btn btn-danger"
                  onClick={handleDelete}
                >
                  刪除
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted">載入中...</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 