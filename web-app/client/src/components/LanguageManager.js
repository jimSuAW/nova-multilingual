import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Edit, Trash2, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const LanguageManager = ({ languages, onLanguageUpdate }) => {
  const { preselectedLanguage } = useParams();
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedLanguage && languages.some(lang => lang.code === preselectedLanguage)) {
      setSelectedLanguage(preselectedLanguage);
    } else if (languages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languages[0].code);
    }
  }, [languages, preselectedLanguage, selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage) {
      fetchLanguageFiles();
    }
  }, [selectedLanguage]);

  const fetchLanguageFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/languages/${selectedLanguage}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching language files:', error);
      toast.error('載入文件失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLanguage = async (languageCode) => {
    if (!window.confirm(`確定要刪除語系 ${languageCode} 嗎？`)) {
      return;
    }

    try {
      await axios.delete(`/api/languages/${languageCode}`);
      toast.success(`語系 ${languageCode} 已刪除`);
      onLanguageUpdate();
      
      if (selectedLanguage === languageCode) {
        setSelectedLanguage(languages.find(lang => lang.code !== languageCode)?.code || null);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || '刪除失敗');
    }
  };

  const handleAutoTranslate = async (languageCode) => {
    if (!window.confirm(`確定要對語系 ${languageCode} 執行自動翻譯嗎？這可能需要一些時間。`)) {
      return;
    }

    try {
      setLoading(true);
      toast.loading('正在執行自動翻譯...');
      
      await axios.post(`/api/languages/${languageCode}/translate`);
      
      toast.dismiss();
      toast.success(`語系 ${languageCode} 自動翻譯完成！`);
      
      // 重新載入文件列表
      fetchLanguageFiles();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.error || '自動翻譯失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <div className="flex gap-4">
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={16} />
              返回儀表板
            </Link>
          </div>
          <h1 className="page-title">語系管理</h1>
          <p className="page-subtitle">管理翻譯文件和內容</p>
        </div>

        <div className="grid">
          {/* 語系選擇側邊欄 */}
          <div className="card">
            <h3>語系列表</h3>
            <div className="language-list">
              {languages.map((language) => (
                <div
                  key={language.code}
                  className={`language-item ${selectedLanguage === language.code ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(language.code)}
                >
                  <div className="language-info">
                    <div className="language-name">{language.name}</div>
                    <div className="language-code">{language.code}</div>
                  </div>
                  <div className="language-actions">
                    {!language.isBase && (
                      <>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAutoTranslate(language.code);
                          }}
                          title="自動翻譯"
                        >
                          <Zap size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLanguage(language.code);
                          }}
                          title="刪除語系"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 文件列表 */}
          <div className="card">
            {selectedLanguage ? (
              <>
                <div className="flex-between mb-4">
                  <h3>翻譯文件 - {languages.find(lang => lang.code === selectedLanguage)?.name}</h3>
                  <span className="text-muted">{files.length} 個文件</span>
                </div>

                {loading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                  </div>
                ) : files.length > 0 ? (
                  <div className="file-list">
                    {files.map((file) => (
                      <div key={file.name} className="file-item">
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-stats">
                            <span className="badge badge-success">
                              已翻譯: {file.stats.translated}
                            </span>
                            <span className="badge badge-warning">
                              空值: {file.stats.empty}
                            </span>
                            <span className="badge badge-secondary">
                              總計: {file.stats.total}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/editor/${selectedLanguage}/${file.name}`}
                          className="btn btn-primary btn-sm"
                        >
                          <Edit size={14} />
                          編輯
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">FileText</div>
                    <h3 className="empty-state-title">沒有翻譯文件</h3>
                    <p className="empty-state-description">
                      此語系還沒有翻譯文件
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">Globe</div>
                <h3 className="empty-state-title">請選擇語系</h3>
                <p className="empty-state-description">
                  從左側選擇一個語系來查看其翻譯文件
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .language-list {
          margin-top: 15px;
        }
        
        .language-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 8px;
        }
        
        .language-item:hover {
          background-color: #f8f9fa;
        }
        
        .language-item.active {
          background-color: #e3f2fd;
          border-left: 3px solid #007bff;
        }
        
        .language-info {
          flex: 1;
        }
        
        .language-name {
          font-weight: 500;
          color: #333;
        }
        
        .language-code {
          font-size: 12px;
          color: #666;
        }
        
        .file-list {
          margin-top: 15px;
        }
        
        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 1px solid #eee;
          border-radius: 6px;
          margin-bottom: 10px;
          transition: box-shadow 0.2s;
        }
        
        .file-item:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .file-info {
          flex: 1;
        }
        
        .file-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
        }
        
        .file-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default LanguageManager; 