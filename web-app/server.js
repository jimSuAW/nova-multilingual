const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 翻譯文件路徑
const TRANSLATIONS_DIR = path.join(__dirname, '..', 'translations');

// API 路由

// 獲取所有語系
app.get('/api/languages', async (req, res) => {
  try {
    if (!await fs.pathExists(TRANSLATIONS_DIR)) {
      return res.json([]);
    }

    const languages = await fs.readdir(TRANSLATIONS_DIR);
    const languageStats = [];

    for (const lang of languages) {
      const langPath = path.join(TRANSLATIONS_DIR, lang);
      const stats = await fs.stat(langPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(langPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        languageStats.push({
          code: lang,
          name: getLanguageName(lang),
          fileCount: jsonFiles.length,
          isBase: lang === 'en'
        });
      }
    }

    res.json(languageStats);
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({ error: 'Failed to get languages' });
  }
});

// 獲取語系的翻譯文件
app.get('/api/languages/:language/files', async (req, res) => {
  try {
    const { language } = req.params;
    const langPath = path.join(TRANSLATIONS_DIR, language);
    
    if (!await fs.pathExists(langPath)) {
      return res.json([]);
    }

    const files = await fs.readdir(langPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const fileStats = [];
    for (const file of jsonFiles) {
      const filePath = path.join(langPath, file);
      const content = await fs.readJson(filePath);
      const stats = await getTranslationStats(content);
      
      fileStats.push({
        name: file,
        path: filePath,
        stats
      });
    }

    res.json(fileStats);
  } catch (error) {
    console.error('Error getting language files:', error);
    res.status(500).json({ error: 'Failed to get language files' });
  }
});

// 獲取翻譯文件內容
app.get('/api/languages/:language/files/:filename', async (req, res) => {
  try {
    const { language, filename } = req.params;
    const filePath = path.join(TRANSLATIONS_DIR, language, filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.readJson(filePath);
    res.json(content);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// 更新翻譯文件
app.put('/api/languages/:language/files/:filename', async (req, res) => {
  try {
    const { language, filename } = req.params;
    const { content } = req.body;
    
    const filePath = path.join(TRANSLATIONS_DIR, language, filename);
    
    await fs.writeJson(filePath, content, { spaces: 2 });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// 新增語系
app.post('/api/languages', async (req, res) => {
  try {
    const { languageCode } = req.body;
    
    if (!languageCode) {
      return res.status(400).json({ error: 'Language code is required' });
    }
    
    const targetPath = path.join(TRANSLATIONS_DIR, languageCode);
    console.log(`[Language Creation] Attempting to create directory at: ${targetPath}`);

    if (await fs.pathExists(targetPath)) {
      return res.status(400).json({ error: 'Language already exists' });
    }
    
    await fs.ensureDir(targetPath);
    console.log(`[Language Creation] Successfully created directory: ${targetPath}`);
    
    // 複製基準語系檔案結構
    const basePath = path.join(TRANSLATIONS_DIR, 'en');
    console.log(`[Language Creation] Copying from base path: ${basePath}`);
    const baseFiles = await fs.readdir(basePath);
    const jsonFiles = baseFiles.filter(file => file.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const sourcePath = path.join(basePath, file);
      const targetFilePath = path.join(targetPath, file);
      
      if (await fs.pathExists(sourcePath)) {
        const content = await fs.readJson(sourcePath);
        const template = createTranslationTemplate(content);
        
        await fs.writeJson(targetFilePath, template, { spaces: 2 });
      }
    }
    console.log(`[Language Creation] Successfully created language template for: ${languageCode}`);

    res.json({ success: true, languageCode });
  } catch (error) {
    console.error(`[Language Creation] Failed to create language ${req.body.languageCode}:`, error);
    res.status(500).json({ error: 'Failed to create language. Check server logs for details.' });
  }
});

// 刪除語系
app.delete('/api/languages/:language', async (req, res) => {
  try {
    const { language } = req.params;
    
    if (language === 'en') {
      return res.status(400).json({ error: 'Cannot delete base language' });
    }

    const langPath = path.join(TRANSLATIONS_DIR, language);
    if (await fs.pathExists(langPath)) {
      await fs.remove(langPath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting language:', error);
    res.status(500).json({ error: 'Failed to delete language' });
  }
});

// 獲取翻譯統計
app.get('/api/languages/:language/stats', async (req, res) => {
  try {
    const { language } = req.params;
    const langPath = path.join(TRANSLATIONS_DIR, language);
    
    if (!await fs.pathExists(langPath)) {
      return res.json({ total: 0, translated: 0, empty: 0, percentage: 0 });
    }

    const files = await fs.readdir(langPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let totalKeys = 0;
    let translatedKeys = 0;
    let emptyKeys = 0;

    for (const file of jsonFiles) {
      const filePath = path.join(langPath, file);
      const content = await fs.readJson(filePath);
      
      let baseContent = null;
      
      // 只有非英文語系才需要載入基準語系進行比較
      if (language !== 'en') {
        const baseFilePath = path.join(TRANSLATIONS_DIR, 'en', file);
        if (await fs.pathExists(baseFilePath)) {
          baseContent = await fs.readJson(baseFilePath);
        }
      }
      
      const stats = await getTranslationStats(content, baseContent);
      
      totalKeys += stats.total;
      translatedKeys += stats.translated;
      emptyKeys += stats.empty;
    }

    const percentage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;

    res.json({
      total: totalKeys,
      translated: translatedKeys,
      empty: emptyKeys,
      percentage
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 匯出翻譯包
app.post('/api/export', async (req, res) => {
  try {
    const { languages } = req.body;
    const exportPath = path.join(__dirname, 'exports');
    await fs.ensureDir(exportPath);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(exportPath, `translations-${timestamp}`);
    await fs.ensureDir(exportDir);

    for (const lang of languages) {
      const sourcePath = path.join(TRANSLATIONS_DIR, lang);
      const targetPath = path.join(exportDir, lang);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
      }
    }

    res.json({ 
      success: true, 
      exportPath: exportDir,
      message: 'Translation package exported successfully'
    });
  } catch (error) {
    console.error('Error exporting translations:', error);
    res.status(500).json({ error: 'Failed to export translations' });
  }
});

// 下載匯出檔案
app.get('/api/download-export', async (req, res) => {
  try {
    const { path: exportPath } = req.query;
    
    if (!exportPath) {
      return res.status(400).json({ error: 'Export path is required' });
    }
    
    if (!await fs.pathExists(exportPath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }
    
    // 創建 ZIP 檔案
    const archiver = require('archiver');
    const zipPath = `${exportPath}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      res.download(zipPath, `translations-${new Date().toISOString().slice(0, 10)}.zip`, (err) => {
        // 下載完成後刪除臨時檔案
        fs.remove(zipPath).catch(console.error);
      });
    });
    
    archive.on('error', (err) => {
      res.status(500).json({ error: 'Failed to create zip file' });
    });
    
    archive.pipe(output);
    archive.directory(exportPath, false);
    archive.finalize();
    
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

// 自動翻譯語系
app.post('/api/languages/:language/translate', async (req, res) => {
  try {
    const { language } = req.params;
    
    if (language === 'en') {
      return res.status(400).json({ error: 'Cannot translate base language' });
    }
    
    const langPath = path.join(TRANSLATIONS_DIR, language);
    if (!await fs.pathExists(langPath)) {
      return res.status(404).json({ error: 'Language not found' });
    }
    
    console.log(`[Auto Translate] Starting optimized translation for ${language}`);
    
    // 執行優化後的自動翻譯
    await autoTranslate(language);
    
    console.log(`[Auto Translate] Completed translation for ${language}`);
    res.json({ success: true, message: 'High-speed translation completed successfully' });
  } catch (error) {
    console.error('Error translating language:', error);
    res.status(500).json({ error: 'Failed to translate language' });
  }
});

// 靜態文件服務
app.use(express.static(path.join(__dirname, 'client', 'build')));

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 所有其他路由都返回 React 應用程式
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// 輔助函數
function getLanguageName(code) {
  const languageNames = {
    // 基本語系（向後兼容）
    'en': 'English',
    'zh-TW': '繁體中文 zh-TW',
    'zh-CN': '简体中文 zh-CN',
    'ja': '日本語 ja',
    'ko': '한국어 ko',
    'es': 'Español es',
    'fr': 'Français fr',
    'de': 'Deutsch de',
    'it': 'Italiano it',
    'pt': 'Português pt',
    'ru': 'Русский ru',
    
    // 標準語系代碼
    // 中文變體
    'zh-Hant-TW': '繁體中文 zh-Hant-TW',
    'zh-Hans-CN': '简体中文 zh-Hans-CN',
    'zh-Hant-HK': '繁體中文（香港）zh-Hant-HK',
    'zh-Hant-MO': '繁體中文（澳門）zh-Hant-MO',
    'zh-Hans-SG': '简体中文（新加坡）zh-Hans-SG',
    
    // 主要歐洲語言
    'es-ES': 'Español es-ES',
    'es-MX': 'Español (México) es-MX',
    'es-AR': 'Español (Argentina) es-AR',
    'fr-FR': 'Français fr-FR',
    'fr-CA': 'Français (Canada) fr-CA',
    'de-DE': 'Deutsch de-DE',
    'de-AT': 'Deutsch (Österreich) de-AT',
    'de-CH': 'Deutsch (Schweiz) de-CH',
    'it-IT': 'Italiano it-IT',
    'it-CH': 'Italiano (Svizzera) it-CH',
    'pt-PT': 'Português pt-PT',
    'pt-BR': 'Português (Brasil) pt-BR',
    'ru-RU': 'Русский ru-RU',
    'pl-PL': 'Polski pl-PL',
    'nl-NL': 'Nederlands nl-NL',
    'nl-BE': 'Nederlands (België) nl-BE',
    'sv-SE': 'Svenska sv-SE',
    'da-DK': 'Dansk da-DK',
    'fi-FI': 'Suomi fi-FI',
    'nb-NO': 'Norsk bokmål nb-NO',
    'nn-NO': 'Norsk nynorsk nn-NO',
    
    // 亞洲語言
    'ja-JP': '日本語 ja-JP',
    'ko-KR': '한국어 ko-KR',
    'th-TH': 'ไทย th-TH',
    'vi-VN': 'Tiếng Việt vi-VN',
    'hi-IN': 'हिन्दी hi-IN',
    'bn-BD': 'বাংলা bn-BD',
    'bn-IN': 'বাংলা (ভারত) bn-IN',
    'id-ID': 'Bahasa Indonesia id-ID',
    'ms-MY': 'Bahasa Melayu ms-MY',
    'ms-BN': 'Bahasa Melayu (Brunei) ms-BN',
    
    // 中東和非洲
    'ar-SA': 'العربية ar-SA',
    'ar-EG': 'العربية (مصر) ar-EG',
    'ar-AE': 'العربية (الإمارات) ar-AE',
    'tr-TR': 'Türkçe tr-TR',
    'he-IL': 'עברית he-IL',
    'fa-IR': 'فارسی fa-IR',
    'fa-AF': 'فارسی (افغانستان) fa-AF',
    
    // 英語變體
    'en-US': 'English (US) en-US',
    'en-GB': 'English (UK) en-GB',
    'en-AU': 'English (Australia) en-AU',
    'en-CA': 'English (Canada) en-CA',
    'en-IN': 'English (India) en-IN',
    'en-SG': 'English (Singapore) en-SG',
    'en-ZA': 'English (South Africa) en-ZA',
    
    // 其他重要語言
    'uk-UA': 'Українська uk-UA',
    'cs-CZ': 'Čeština cs-CZ',
    'hu-HU': 'Magyar hu-HU',
    'ro-RO': 'Română ro-RO',
    'bg-BG': 'Български bg-BG',
    'hr-HR': 'Hrvatski hr-HR',
    'sk-SK': 'Slovenčina sk-SK',
    'sl-SI': 'Slovenščina sl-SI',
    'et-EE': 'Eesti et-EE',
    'lv-LV': 'Latviešu lv-LV',
    'lt-LT': 'Lietuvių lt-LT',
    'mt-MT': 'Malti mt-MT',
    'el-GR': 'Ελληνικά el-GR',
    'cy-GB': 'Cymraeg cy-GB',
    'ga-IE': 'Gaeilge ga-IE',
    'is-IS': 'Íslenska is-IS',
    'fo-FO': 'Føroyskt fo-FO'
  };
  
  return languageNames[code] || code;
}

function createTranslationTemplate(obj) {
  const template = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      template[key] = createTranslationTemplate(value);
    } else {
      template[key] = '';
    }
  }
  
  return template;
}

async function getTranslationStats(obj, baseObj = null) {
  let total = 0;
  let translated = 0;
  let empty = 0;

  function countKeys(obj, baseObj = null, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 如果是嵌套對象，遞歸計算
        const baseValue = baseObj && baseObj[key];
        countKeys(value, baseValue, currentPath);
      } else {
        // 只計算葉子節點（實際的翻譯鍵值）
        total++;
        
        if (value === '' || value === null || value === undefined) {
          empty++;
        } else {
          // 如果沒有基準語系（即本身就是基準語系），直接計算非空值
          if (!baseObj) {
            translated++;
          } else {
            // 檢查是否與基準語系相同（英文）
            const baseValue = baseObj && baseObj[key];
            if (baseValue && value === baseValue) {
              // 如果與基準語系相同，不算已翻譯
              empty++;
            } else {
              translated++;
            }
          }
        }
      }
    }
  }

  countKeys(obj, baseObj);
  return { total, translated, empty };
}

async function autoTranslate(languageCode) {
  return new Promise((resolve, reject) => {
    const translatorPath = path.join(__dirname, '..', 'scripts', 'auto-translator.js');
    const child = spawn('node', [translatorPath, 'translate', languageCode], {
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Translation failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Translation Manager Web Server running on port ${PORT}`);
  console.log(`📁 Translations directory: ${TRANSLATIONS_DIR}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Node.js version: ${process.version}`);
  console.log(`📂 Current working directory: ${process.cwd()}`);
  console.log(`📂 __dirname: ${__dirname}`);
  
  // 檢查翻譯目錄是否存在
  fs.pathExists(TRANSLATIONS_DIR).then(exists => {
    if (exists) {
      console.log(`✅ Translations directory exists`);
    } else {
      console.log(`⚠️  Translations directory does not exist, creating...`);
      fs.ensureDir(TRANSLATIONS_DIR).then(() => {
        console.log(`✅ Translations directory created`);
      }).catch(err => {
        console.error(`❌ Failed to create translations directory:`, err);
      });
    }
  }).catch(err => {
    console.error(`❌ Error checking translations directory:`, err);
  });
  
  // 檢查前端建置檔案是否存在
  const buildPath = path.join(__dirname, 'client', 'build');
  fs.pathExists(buildPath).then(exists => {
    if (exists) {
      console.log(`✅ Frontend build directory exists`);
    } else {
      console.log(`⚠️  Frontend build directory does not exist`);
    }
  }).catch(err => {
    console.error(`❌ Error checking build directory:`, err);
  });
}); 