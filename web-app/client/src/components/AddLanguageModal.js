import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddLanguageModal = ({ onClose, onAdd, loading, existingLanguages }) => {
  const [languageCode, setLanguageCode] = useState('');

  // 使用本地化名稱的語系代碼列表
  const languageOptions = [
    // 主流語系（無國家代碼）
    { code: 'zh', name: '中文 zh' },
    { code: 'ja', name: '日本語 ja' },
    { code: 'ko', name: '한국어 ko' },
    { code: 'es', name: 'Español es' },
    { code: 'fr', name: 'Français fr' },
    { code: 'de', name: 'Deutsch de' },
    { code: 'it', name: 'Italiano it' },
    { code: 'pt', name: 'Português pt' },
    { code: 'ru', name: 'Русский ru' },
    { code: 'ar', name: 'العربية ar' },
    
    // 分隔線
    { code: 'separator', name: '── 地區特定語系 ──', disabled: true },
    
    // 中文變體
    { code: 'zh-Hant-TW', name: '繁體中文 zh-Hant-TW' },
    { code: 'zh-Hans-CN', name: '简体中文 zh-Hans-CN' },
    { code: 'zh-Hant-HK', name: '繁體中文（香港）zh-Hant-HK' },
    
    // 主要歐洲語言
    { code: 'es-ES', name: 'Español es-ES' },
    { code: 'fr-FR', name: 'Français fr-FR' },
    { code: 'de-DE', name: 'Deutsch de-DE' },
    { code: 'it-IT', name: 'Italiano it-IT' },
    { code: 'pt-PT', name: 'Português pt-PT' },
    { code: 'pt-BR', name: 'Português (Brasil) pt-BR' },
    { code: 'ru-RU', name: 'Русский ru-RU' },
    { code: 'pl-PL', name: 'Polski pl-PL' },
    { code: 'nl-NL', name: 'Nederlands nl-NL' },
    { code: 'sv-SE', name: 'Svenska sv-SE' },
    { code: 'da-DK', name: 'Dansk da-DK' },
    { code: 'fi-FI', name: 'Suomi fi-FI' },
    { code: 'nb-NO', name: 'Norsk bokmål nb-NO' },
    
    // 亞洲語言
    { code: 'ja-JP', name: '日本語 ja-JP' },
    { code: 'ko-KR', name: '한국어 ko-KR' },
    { code: 'th-TH', name: 'ไทย th-TH' },
    { code: 'vi-VN', name: 'Tiếng Việt vi-VN' },
    { code: 'hi-IN', name: 'हिन्दी hi-IN' },
    { code: 'bn-BD', name: 'বাংলা bn-BD' },
    { code: 'id-ID', name: 'Bahasa Indonesia id-ID' },
    { code: 'ms-MY', name: 'Bahasa Melayu ms-MY' },
    
    // 中東和非洲
    { code: 'ar-SA', name: 'العربية ar-SA' },
    { code: 'ar-EG', name: 'العربية (مصر) ar-EG' },
    { code: 'tr-TR', name: 'Türkçe tr-TR' },
    { code: 'he-IL', name: 'עברית he-IL' },
    { code: 'fa-IR', name: 'فارسی fa-IR' },
    
    // 英語變體
    { code: 'en-US', name: 'English (US) en-US' },
    { code: 'en-GB', name: 'English (UK) en-GB' },
    { code: 'en-AU', name: 'English (Australia) en-AU' },
    { code: 'en-CA', name: 'English (Canada) en-CA' },
    
    // 其他重要語言
    { code: 'uk-UA', name: 'Українська uk-UA' },
    { code: 'cs-CZ', name: 'Čeština cs-CZ' },
    { code: 'hu-HU', name: 'Magyar hu-HU' },
    { code: 'ro-RO', name: 'Română ro-RO' },
    { code: 'bg-BG', name: 'Български bg-BG' },
    { code: 'hr-HR', name: 'Hrvatski hr-HR' },
    { code: 'sk-SK', name: 'Slovenčina sk-SK' },
    { code: 'sl-SI', name: 'Slovenščina sl-SI' }
  ];

  const availableLanguages = languageOptions.filter(
    lang => lang.code !== 'separator' && !existingLanguages.includes(lang.code)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (languageCode) {
      onAdd(languageCode);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新增語系</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>選擇語系</label>
                             <select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">請選擇語系</option>
                {languageOptions.map(lang => {
                  if (lang.code === 'separator') {
                    return (
                      <option key={lang.code} disabled style={{ color: '#999', fontStyle: 'italic' }}>
                        {lang.name}
                      </option>
                    );
                  }
                  if (existingLanguages.includes(lang.code)) {
                    return null;
                  }
                  return (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {availableLanguages.length === 0 && (
              <div className="text-muted">
                所有支援的語系都已經創建了
              </div>
            )}
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
              className="btn btn-primary"
              disabled={!languageCode || loading}
            >
              {loading ? '創建中...' : '創建語系'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLanguageModal; 