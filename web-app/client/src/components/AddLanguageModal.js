import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddLanguageModal = ({ onClose, onAdd, loading, existingLanguages }) => {
  const [languageCode, setLanguageCode] = useState('');

  const languageOptions = [
    { code: 'zh-TW', name: '繁體中文 (台灣)' },
    { code: 'zh-CN', name: '簡體中文 (中國)' },
    { code: 'es', name: 'Español (西班牙語)' },
    { code: 'fr', name: 'Français (法語)' },
    { code: 'de', name: 'Deutsch (德語)' },
    { code: 'ja', name: '日本語 (日語)' },
    { code: 'ko', name: '한국어 (韓語)' },
    { code: 'pt', name: 'Português (葡萄牙語)' },
    { code: 'ru', name: 'Русский (俄語)' },
    { code: 'it', name: 'Italiano (義大利語)' },
    { code: 'ar', name: 'العربية (阿拉伯語)' },
    { code: 'hi', name: 'हिन्दी (印地語)' },
    { code: 'tr', name: 'Türkçe (土耳其語)' },
    { code: 'pl', name: 'Polski (波蘭語)' },
    { code: 'vi', name: 'Tiếng Việt (越南語)' },
    { code: 'th', name: 'ไทย (泰語)' },
    { code: 'nl', name: 'Nederlands (荷蘭語)' },
    { code: 'sv', name: 'Svenska (瑞典語)' },
    { code: 'da', name: 'Dansk (丹麥語)' },
    { code: 'fi', name: 'Suomi (芬蘭語)' }
  ];

  const availableLanguages = languageOptions.filter(
    lang => !existingLanguages.includes(lang.code)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (languageCode) {
      onAdd(languageCode);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>新增語系</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">選擇語系</label>
            <select
              className="form-input"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">請選擇語系</option>
              {availableLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {availableLanguages.length === 0 && (
            <div className="text-muted mb-4">
              所有支援的語系都已經創建了
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!languageCode || loading}
            >
              {loading ? '創建中...' : '創建語系'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLanguageModal; 