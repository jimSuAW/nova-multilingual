import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Globe, FileText, Download, Upload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import AddLanguageModal from './AddLanguageModal';

const Dashboard = ({ languages, onLanguageUpdate }) => {
  // 過濾掉基底語系，只顯示可編輯的語系
  const editableLanguages = languages.filter(lang => !lang.isBase);
  
  const [stats, setStats] = useState({
    totalLanguages: 0,
    totalFiles: 0,
    totalKeys: 0,
    averageCompletion: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    calculateStats();
  }, [languages]);

  const calculateStats = async () => {
    const totalLanguages = editableLanguages.length;
    const totalFiles = editableLanguages.reduce((sum, lang) => sum + lang.fileCount, 0);
    
    // 從 API 獲取所有可編輯語系的統計數據
    let totalKeys = 0;
    let totalCompletion = 0;
    let validLanguages = 0;
    
    for (const language of editableLanguages) {
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
    
    // 修正平均完成度計算：使用更精確的計算
    const averageCompletion = validLanguages > 0 ? 
      Math.round((totalCompletion / validLanguages) * 10) / 10 : 0;
    
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
      window.location.reload(); // 直接重新整理頁面
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.error || '創建語系失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (languages.length === 0) {
        toast.error('沒有語系可匯出');
        return;
      }
      
      toast.loading('🔄 正在匯出翻譯包...', { duration: 0 });
      
      const response = await axios.get('/api/translations/export', {
        responseType: 'blob'
      });
      
      // 創建下載連結
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `translations-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('📦 翻譯包匯出成功！');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ 匯出失敗：' + (error.response?.data?.error || error.message));
    }
  };

  const handleImportTranslations = async (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.zip')) {
      toast.error('❌ 請選擇 ZIP 檔案');
      return;
    }
    
    if (!window.confirm('⚠️ 匯入將會取代現有的所有翻譯資料！\n\n確定要繼續嗎？\n（原資料會自動備份）')) {
      return;
    }
    
    try {
      toast.loading('🔄 正在匯入翻譯資料...', { duration: 0 });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post('/api/translations/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.dismiss();
      toast.success(`✅ 翻譯資料匯入成功！\n💾 舊資料已備份`);
      
      // 重新載入頁面
      window.location.reload();
    } catch (error) {
      toast.dismiss();
      toast.error('❌ 匯入失敗：' + (error.response?.data?.error || error.message));
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImportTranslations(file);
    }
    // 重置 input 值，允許重複選擇同一檔案
    event.target.value = '';
  };

  const handleSyncStructure = async () => {
    if (!window.confirm('⚠️ 同步語系結構會根據基底檔案更新所有語系的檔案結構。\n\n這個操作會：\n• 添加缺失的檔案和翻譯鍵值\n• 保留現有的翻譯內容\n\n確定要繼續嗎？')) {
      return;
    }
    
    try {
      toast.loading('🔄 正在同步語系結構...', { duration: 0 });
      
      const response = await axios.post('/api/translations/sync');
      
      toast.dismiss();
      
      if (response.data.success) {
        const result = response.data.syncResult;
        toast.success(`✅ 同步完成！\n語系處理：${result.languagesProcessed}\n新增檔案：${result.filesAdded}\n新增欄位：${result.fieldsAdded}`);
        window.location.reload(); // 直接重新整理頁面
      } else {
        toast.error('❌ 同步失敗：' + response.data.error);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ 同步失敗：' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div>
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Nova 翻譯管理</h1>
          <p className="page-subtitle">請設定好語系後選擇匯出翻譯包，並交給 Astral Web 的 PM</p>
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
            disabled={editableLanguages.length === 0}
          >
            <Download size={16} />
            匯出翻譯包
          </button>
          
          <button 
            className="btn btn-warning"
            onClick={() => fileInputRef.current?.click()}
            title="匯入翻譯資料（會取代現有資料）"
          >
            <Upload size={16} />
            匯入翻譯包
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".zip"
            style={{ display: 'none' }}
          />
          
          <Link to="/languages" className="btn btn-secondary">
            <Globe size={16} />
            管理語系
          </Link>
          
          <button 
            className="btn btn-warning"
            onClick={() => setShowSourceModal(true)}
            title="更新基底檔案（需要密碼）"
          >
            🔧 更新基底
          </button>
        </div>

        {/* 語系卡片 */}
        {editableLanguages.length > 0 ? (
          <div className="language-grid">
            {editableLanguages.map((language) => (
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
            <h2 className="empty-state-title">🌍 尚未建立任何語系</h2>
            <p className="empty-state-description">
              請新增您要翻譯的語系
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
      
      {/* 更新基底檔案模態框 */}
      {showSourceModal && (
        <UpdateSourceModal
          onClose={() => setShowSourceModal(false)}
          onSuccess={() => {
            setShowSourceModal(false);
            window.location.reload(); // 直接重新整理頁面
          }}
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
              <span>文件: {stats.files || language.fileCount}</span>
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
                to={`/languages/${language.code}`}
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

// 更新基底檔案模態框組件
const UpdateSourceModal = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('請輸入密碼');
      return;
    }
    
    if (!file) {
      toast.error('請選擇 ZIP 檔案');
      return;
    }
    
    if (!file.name.endsWith('.zip')) {
      toast.error('請選擇 ZIP 檔案');
      return;
    }
    
    if (!window.confirm('⚠️ 這將會取代所有基底檔案！\n\n確定要繼續嗎？\n（原檔案會自動備份）')) {
      return;
    }

    try {
      setLoading(true);
      toast.loading('🔄 正在更新基底檔案...', { duration: 0 });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);
      
      const response = await axios.post('/api/source/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.dismiss();
      
      let message = `✅ ${response.data.message}\n💾 舊檔案已備份`;
      
      // 顯示同步結果
      if (response.data.syncResult) {
        const sync = response.data.syncResult;
        if (sync.error) {
          message += `\n⚠️ 同步警告: ${sync.error}`;
        } else if (sync.message) {
          message += `\n📋 ${sync.message}`;
        } else {
          message += `\n🔄 語系同步完成: 處理了 ${sync.languagesProcessed} 個語系`;
          if (sync.filesAdded > 0) {
            message += `，新增 ${sync.filesAdded} 個檔案`;
          }
          if (sync.fieldsAdded > 0) {
            message += `，新增 ${sync.fieldsAdded} 個欄位`;
          }
          if (sync.filesRemoved > 0) {
            message += `，刪除 ${sync.filesRemoved} 個檔案`;
          }
          if (sync.fieldsRemoved > 0) {
            message += `，刪除 ${sync.fieldsRemoved} 個欄位`;
          }
          if (sync.errors && sync.errors.length > 0) {
            message += `\n⚠️ 部分語系同步失敗: ${sync.errors.join(', ')}`;
          }
        }
      }
      
      toast.success(message);
      
      // 呼叫成功回調來刷新數據
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      toast.dismiss();
      if (error.response?.status === 401) {
        toast.error('❌ 密碼錯誤');
      } else {
        toast.error('❌ 更新失敗：' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔧 更新基底檔案</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>密碼 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入管理員密碼"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label>ZIP 檔案 *</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files[0])}
                required
                disabled={loading}
              />
              <small className="form-help">
                請上傳包含基底 JSON 檔案的 ZIP 壓縮檔
              </small>
            </div>
            
            <div className="warning-box">
              <strong>⚠️ 重要提醒：</strong>
              <ul>
                <li>這將會取代所有基底檔案</li>
                <li>原檔案會自動備份</li>
                <li>請確保 ZIP 檔案包含正確的 JSON 結構</li>
                <li>此操作需要管理員權限</li>
              </ul>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="btn btn-warning"
              disabled={loading}
            >
              {loading ? '更新中...' : '更新基底檔案'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard; 