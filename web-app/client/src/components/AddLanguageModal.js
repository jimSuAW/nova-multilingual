import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddLanguageModal = ({ onClose, onAdd, loading, existingLanguages }) => {
  const [languageCode, setLanguageCode] = useState('');

  // 使用標準的語系代碼列表
  const languageOptions = [
    // 中文變體
    { code: 'zh-Hant-TW', name: 'Chinese (Traditional, Taiwan) (zh-Hant-TW)' },
    { code: 'zh-Hans-CN', name: 'Chinese (Simplified, China) (zh-Hans-CN)' },
    { code: 'zh-Hant-HK', name: 'Chinese (Traditional, Hong Kong SAR China) (zh-Hant-HK)' },
    
    // 主要歐洲語言
    { code: 'es-ES', name: 'Spanish (Spain) (es-ES)' },
    { code: 'fr-FR', name: 'French (France) (fr-FR)' },
    { code: 'de-DE', name: 'German (Germany) (de-DE)' },
    { code: 'it-IT', name: 'Italian (Italy) (it-IT)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal) (pt-PT)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil) (pt-BR)' },
    { code: 'ru-RU', name: 'Russian (Russia) (ru-RU)' },
    { code: 'pl-PL', name: 'Polish (Poland) (pl-PL)' },
    { code: 'nl-NL', name: 'Dutch (Netherlands) (nl-NL)' },
    { code: 'sv-SE', name: 'Swedish (Sweden) (sv-SE)' },
    { code: 'da-DK', name: 'Danish (Denmark) (da-DK)' },
    { code: 'fi-FI', name: 'Finnish (Finland) (fi-FI)' },
    { code: 'nb-NO', name: 'Norwegian Bokmål (Norway) (nb-NO)' },
    
    // 亞洲語言
    { code: 'ja-JP', name: 'Japanese (Japan) (ja-JP)' },
    { code: 'ko-KR', name: 'Korean (South Korea) (ko-KR)' },
    { code: 'th-TH', name: 'Thai (Thailand) (th-TH)' },
    { code: 'vi-VN', name: 'Vietnamese (Vietnam) (vi-VN)' },
    { code: 'hi-IN', name: 'Hindi (India) (hi-IN)' },
    { code: 'bn-BD', name: 'Bengali (Bangladesh) (bn-BD)' },
    { code: 'id-ID', name: 'Indonesian (Indonesia) (id-ID)' },
    { code: 'ms-MY', name: 'Malay (Malaysia) (ms-MY)' },
    
    // 中東和非洲
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia) (ar-SA)' },
    { code: 'ar-EG', name: 'Arabic (Egypt) (ar-EG)' },
    { code: 'tr-TR', name: 'Turkish (Turkey) (tr-TR)' },
    { code: 'he-IL', name: 'Hebrew (Israel) (he-IL)' },
    { code: 'fa-IR', name: 'Persian (Iran) (fa-IR)' },
    
    // 英語變體
    { code: 'en-US', name: 'English (United States) (en-US)' },
    { code: 'en-GB', name: 'English (United Kingdom) (en-GB)' },
    { code: 'en-AU', name: 'English (Australia) (en-AU)' },
    { code: 'en-CA', name: 'English (Canada) (en-CA)' },
    
    // 其他重要語言
    { code: 'uk-UA', name: 'Ukrainian (Ukraine) (uk-UA)' },
    { code: 'cs-CZ', name: 'Czech (Czech Republic) (cs-CZ)' },
    { code: 'hu-HU', name: 'Hungarian (Hungary) (hu-HU)' },
    { code: 'ro-RO', name: 'Romanian (Romania) (ro-RO)' },
    { code: 'bg-BG', name: 'Bulgarian (Bulgaria) (bg-BG)' },
    { code: 'hr-HR', name: 'Croatian (Croatia) (hr-HR)' },
    { code: 'sk-SK', name: 'Slovak (Slovakia) (sk-SK)' },
    { code: 'sl-SI', name: 'Slovenian (Slovenia) (sl-SI)' }
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
                  {lang.name}
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