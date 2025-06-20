import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const TranslationEditor = ({ languages }) => {
  const { language, filename } = useParams();
  const [content, setContent] = useState(null);
  const [originalContent, setOriginalContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFileContent();
  }, [language, filename]);

  const fetchFileContent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/languages/${language}/files/${filename}`);
      setContent(response.data);
      setOriginalContent(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error fetching file content:', error);
      toast.error('載入文件失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`/api/languages/${language}/files/${filename}`, {
        content: content
      });
      toast.success('保存成功');
      setOriginalContent(JSON.stringify(content, null, 2));
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要重置所有更改嗎？')) {
      setContent(JSON.parse(originalContent));
      toast.success('已重置');
    }
  };

  const hasChanges = () => {
    return JSON.stringify(content, null, 2) !== originalContent;
  };

  const updateNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const newObj = { ...obj };
    let current = newObj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] = { ...current[keys[i]] };
    }
    
    current[keys[keys.length - 1]] = value;
    return newObj;
  };

  const renderTranslationFields = (obj, path = '') => {
    return Object.entries(obj).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        return (
          <div key={currentPath} className="translation-group">
            <h4 className="group-title">{key}</h4>
            <div className="group-content">
              {renderTranslationFields(value, currentPath)}
            </div>
          </div>
        );
      } else {
        return (
          <div key={currentPath} className="translation-field">
            <label className="field-label">{currentPath}</label>
            <input
              type="text"
              className="field-input"
              value={value || ''}
              onChange={(e) => {
                const newContent = updateNestedValue(content, currentPath, e.target.value);
                setContent(newContent);
              }}
              placeholder="輸入翻譯..."
            />
          </div>
        );
      }
    });
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  const languageName = languages.find(lang => lang.code === language)?.name || language;

  return (
    <div>
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <div className="flex gap-4">
            <Link to="/languages" className="btn btn-secondary">
              <ArrowLeft size={16} />
              返回語系管理
            </Link>
          </div>
          <h1 className="page-title">編輯翻譯</h1>
          <p className="page-subtitle">
            {languageName} - {filename}
          </p>
        </div>

        <div className="card">
          <div className="flex-between mb-4">
            <h3>翻譯內容</h3>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={!hasChanges()}
              >
                <RotateCcw size={16} />
                重置
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!hasChanges() || saving}
              >
                <Save size={16} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          {content && (
            <div className="translation-editor">
              {renderTranslationFields(content)}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .translation-editor {
          max-height: 600px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 20px;
        }
        
        .translation-group {
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .group-title {
          background-color: #f8f9fa;
          padding: 12px 16px;
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .group-content {
          padding: 16px;
        }
        
        .translation-field {
          margin-bottom: 15px;
        }
        
        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 6px;
          font-family: monospace;
        }
        
        .field-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .field-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .field-input:placeholder {
          color: #999;
        }
      `}</style>
    </div>
  );
};

export default TranslationEditor; 