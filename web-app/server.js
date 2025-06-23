const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 檔案上傳中間件
const upload = multer({ dest: 'uploads/' });

// 翻譯文件路徑
const TRANSLATIONS_DIR = path.join(__dirname, '..', 'translations');
const SOURCE_DIR = path.join(__dirname, '..', 'source');

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
          isBase: false // 移除基底語系概念，所有 translations 中的都是翻譯
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
    
    // 複製基底檔案結構
    console.log(`[Language Creation] Copying from source path: ${SOURCE_DIR}`);
    const baseFiles = await fs.readdir(SOURCE_DIR);
    const jsonFiles = baseFiles.filter(file => file.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const sourcePath = path.join(SOURCE_DIR, file);
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

// 匯出 translations 資料夾為 ZIP
app.get('/api/translations/export', async (req, res) => {
  try {
    console.log('[Export] Starting translations export...');
    
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="translations-${Date.now()}.zip"`);
    
    archive.pipe(res);
    
    // 將整個 translations 資料夾加入壓縮檔
    archive.directory(TRANSLATIONS_DIR, 'translations');
    
    archive.on('error', (err) => {
      console.error('[Export] Archive error:', err);
      res.status(500).json({ error: 'Export failed' });
    });
    
    archive.on('end', () => {
      console.log('[Export] Export completed successfully');
    });
    
    await archive.finalize();
  } catch (error) {
    console.error('[Export] Export failed:', error);
    res.status(500).json({ error: 'Failed to export translations' });
  }
});

// 匯入 ZIP 並合併翻譯（保護基底語系）
app.post('/api/translations/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Import] Starting translations import...');
    
    const zipPath = req.file.path;
    const tempExtractPath = path.join(__dirname, 'temp-import');
    const backupPath = `${TRANSLATIONS_DIR}-backup-${Date.now()}`;
    
    // 備份現有的 translations 資料夾
    if (await fs.pathExists(TRANSLATIONS_DIR)) {
      console.log(`[Import] Backing up existing data to: ${backupPath}`);
      await fs.copy(TRANSLATIONS_DIR, backupPath);
    }
    
    // 清理臨時解壓縮資料夾
    if (await fs.pathExists(tempExtractPath)) {
      await fs.remove(tempExtractPath);
    }
    
    // 解壓縮到臨時資料夾
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempExtractPath }))
        .on('close', resolve)
        .on('error', reject);
    });
    
    // 尋找解壓縮後的 translations 資料夾
    const extractedTranslationsPath = path.join(tempExtractPath, 'translations');
    if (!await fs.pathExists(extractedTranslationsPath)) {
      throw new Error('ZIP 檔案中找不到 translations 資料夾');
    }
    
    // 獲取所有語系資料夾
    const importedLanguages = await fs.readdir(extractedTranslationsPath);
    console.log(`[Import] Found languages in ZIP: ${importedLanguages.join(', ')}`);
    
    // 確保 translations 資料夾存在
    await fs.ensureDir(TRANSLATIONS_DIR);
    
    // 合併每個語系（跳過 en 基底語系）
    for (const lang of importedLanguages) {
      const sourceLangPath = path.join(extractedTranslationsPath, lang);
      const targetLangPath = path.join(TRANSLATIONS_DIR, lang);
      
      // 檢查是否為資料夾
      const stats = await fs.stat(sourceLangPath);
      if (!stats.isDirectory()) {
        console.log(`[Import] Skipping non-directory: ${lang}`);
        continue;
      }
      
      // 🚨 重要：保護基底語系 en
      if (lang === 'en') {
        console.log(`[Import] ⚠️  跳過基底語系 'en'，不允許覆蓋`);
        continue;
      }
      
      console.log(`[Import] Processing language: ${lang}`);
      
      // 確保目標語系資料夾存在
      await fs.ensureDir(targetLangPath);
      
      // 複製所有 JSON 檔案
      const files = await fs.readdir(sourceLangPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const sourceFilePath = path.join(sourceLangPath, file);
        const targetFilePath = path.join(targetLangPath, file);
        
        console.log(`[Import] Copying: ${lang}/${file}`);
        await fs.copy(sourceFilePath, targetFilePath);
      }
    }
    
    // 清理臨時檔案
    await fs.remove(tempExtractPath);
    await fs.remove(zipPath);
    
    const importedCount = importedLanguages.filter(lang => lang !== 'en').length;
    console.log(`[Import] Import completed successfully. Imported ${importedCount} languages.`);
    
    res.json({ 
      success: true, 
      message: `匯入完成！已匯入 ${importedCount} 個語系（跳過基底語系 en）`,
      importedLanguages: importedLanguages.filter(lang => lang !== 'en'),
      backup: backupPath 
    });
    
  } catch (error) {
    console.error('[Import] Import failed:', error);
    
    // 清理臨時檔案
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
    
    const tempExtractPath = path.join(__dirname, 'temp-import');
    if (await fs.pathExists(tempExtractPath)) {
      await fs.remove(tempExtractPath).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to import translations', 
      details: error.message 
    });
  }
});

// API: 手動同步語系結構
app.post('/api/translations/sync', async (req, res) => {
  try {
    console.log('[API] Manual sync requested');
    const syncResult = await syncAllLanguagesWithSource();
    
    res.json({
      success: true,
      message: '語系結構同步完成',
      syncResult: syncResult
    });
  } catch (error) {
    console.error('[API] Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新基底檔案（需要密碼保護）
app.post('/api/source/update', upload.single('file'), async (req, res) => {
  try {
    const { password } = req.body;
    
    // 密碼驗證
    if (password !== '24625602') {
      return res.status(401).json({ error: '密碼錯誤' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Source Update] Starting source files update...');
    
    const zipPath = req.file.path;
    const tempExtractPath = path.join(__dirname, 'temp-source-import');
    const backupPath = `${SOURCE_DIR}-backup-${Date.now()}`;
    
    // 備份現有的 source 資料夾
    if (await fs.pathExists(SOURCE_DIR)) {
      console.log(`[Source Update] Backing up existing source to: ${backupPath}`);
      await fs.copy(SOURCE_DIR, backupPath);
    }
    
    // 清理臨時解壓縮資料夾
    if (await fs.pathExists(tempExtractPath)) {
      await fs.remove(tempExtractPath);
    }
    
    // 解壓縮到臨時資料夾
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempExtractPath }))
        .on('close', resolve)
        .on('error', reject);
    });
    
    // 尋找解壓縮後的 source 資料夾或 JSON 檔案
    let extractedSourcePath = path.join(tempExtractPath, 'source');
    if (!await fs.pathExists(extractedSourcePath)) {
      // 如果沒有 source 資料夾，檢查是否直接包含 JSON 檔案
      const files = await fs.readdir(tempExtractPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      if (jsonFiles.length > 0) {
        extractedSourcePath = tempExtractPath;
      } else {
        throw new Error('ZIP 檔案中找不到 source 資料夾或 JSON 檔案');
      }
    }
    
    // 驗證必要的 JSON 檔案
    const files = await fs.readdir(extractedSourcePath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      throw new Error('ZIP 檔案中沒有找到 JSON 檔案');
    }
    
    console.log(`[Source Update] Found ${jsonFiles.length} JSON files: ${jsonFiles.join(', ')}`);
    
    // 清空並重新建立 source 資料夾
    if (await fs.pathExists(SOURCE_DIR)) {
      await fs.remove(SOURCE_DIR);
    }
    await fs.ensureDir(SOURCE_DIR);
    
    // 複製所有 JSON 檔案到 source 資料夾
    for (const file of jsonFiles) {
      const sourceFilePath = path.join(extractedSourcePath, file);
      const targetFilePath = path.join(SOURCE_DIR, file);
      
      console.log(`[Source Update] Copying: ${file}`);
      await fs.copy(sourceFilePath, targetFilePath);
    }
    
    // 清理臨時檔案
    await fs.remove(tempExtractPath);
    await fs.remove(zipPath);
    
         console.log(`[Source Update] Source update completed successfully. Updated ${jsonFiles.length} files.`);
     
     // 同步更新所有現有語系的結構
     const syncResult = await syncAllLanguagesWithSource();
     
     res.json({ 
       success: true, 
       message: `基底檔案更新完成！已更新 ${jsonFiles.length} 個檔案`,
       updatedFiles: jsonFiles,
       backup: backupPath,
       syncResult: syncResult
     });
    
  } catch (error) {
    console.error('[Source Update] Update failed:', error);
    
    // 清理臨時檔案
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
    
    const tempExtractPath = path.join(__dirname, 'temp-source-import');
    if (await fs.pathExists(tempExtractPath)) {
      await fs.remove(tempExtractPath).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to update source files', 
      details: error.message 
    });
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

// 同步所有語系與基底檔案結構
async function syncAllLanguagesWithSource() {
  try {
    console.log('[Sync] Starting language structure sync...');
    
    // 檢查 source 和 translations 目錄
    if (!await fs.pathExists(SOURCE_DIR)) {
      throw new Error('Source directory not found');
    }
    
    if (!await fs.pathExists(TRANSLATIONS_DIR)) {
      console.log('[Sync] No translations directory found, skipping sync');
      return { message: 'No languages to sync' };
    }
    
    // 獲取所有現有語系
    const languages = await fs.readdir(TRANSLATIONS_DIR);
    const languageDirs = [];
    
    for (const lang of languages) {
      const langPath = path.join(TRANSLATIONS_DIR, lang);
      const stats = await fs.stat(langPath);
      if (stats.isDirectory()) {
        languageDirs.push(lang);
      }
    }
    
    if (languageDirs.length === 0) {
      console.log('[Sync] No language directories found');
      return { message: 'No languages to sync' };
    }
    
    console.log(`[Sync] Found ${languageDirs.length} languages: ${languageDirs.join(', ')}`);
    
    // 獲取 source 中的所有 JSON 檔案
    const sourceFiles = await fs.readdir(SOURCE_DIR);
    const jsonFiles = sourceFiles.filter(file => file.endsWith('.json'));
    
    console.log(`[Sync] Found ${jsonFiles.length} source files: ${jsonFiles.join(', ')}`);
    
    let syncStats = {
      languagesProcessed: 0,
      filesAdded: 0,
      fieldsAdded: 0,
      errors: []
    };
    
    // 為每個語系同步結構
    for (const lang of languageDirs) {
      try {
        console.log(`[Sync] Processing language: ${lang}`);
        const langPath = path.join(TRANSLATIONS_DIR, lang);
        
        // 處理每個 JSON 檔案
        for (const file of jsonFiles) {
          const sourceFilePath = path.join(SOURCE_DIR, file);
          const targetFilePath = path.join(langPath, file);
          
          // 讀取基底檔案結構
          const sourceContent = await fs.readJson(sourceFilePath);
          
          // 檢查目標檔案是否存在
          if (!await fs.pathExists(targetFilePath)) {
            // 檔案不存在，創建空的翻譯結構
            console.log(`[Sync] Adding new file: ${lang}/${file}`);
            const emptyStructure = createTranslationTemplate(sourceContent);
            await fs.writeJson(targetFilePath, emptyStructure, { spaces: 2 });
            syncStats.filesAdded++;
          } else {
            // 檔案存在，同步結構
            const targetContent = await fs.readJson(targetFilePath);
            const { updated, fieldsAdded } = syncStructure(sourceContent, targetContent);
            
            if (fieldsAdded > 0) {
              console.log(`[Sync] Updated structure: ${lang}/${file} (${fieldsAdded} fields added)`);
              await fs.writeJson(targetFilePath, updated, { spaces: 2 });
              syncStats.fieldsAdded += fieldsAdded;
            }
          }
        }
        
        syncStats.languagesProcessed++;
      } catch (error) {
        console.error(`[Sync] Error processing language ${lang}:`, error);
        syncStats.errors.push(`${lang}: ${error.message}`);
      }
    }
    
    console.log('[Sync] Language structure sync completed');
    console.log(`[Sync] Stats:`, syncStats);
    
    return syncStats;
    
  } catch (error) {
    console.error('[Sync] Sync failed:', error);
    return { error: error.message };
  }
}

// 同步單個結構（遞歸）
function syncStructure(sourceObj, targetObj, path = '') {
  let fieldsAdded = 0;
  let updated = { ...targetObj };
  
  for (const [key, value] of Object.entries(sourceObj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in updated)) {
      // 新欄位，需要添加
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        updated[key] = createTranslationTemplate(value);
        const subFields = countFields(value);
        fieldsAdded += subFields;
        console.log(`[Sync] Added new object: ${currentPath} (${subFields} fields)`);
      } else {
        updated[key] = '';
        fieldsAdded++;
        console.log(`[Sync] Added new field: ${currentPath}`);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 遞歸處理嵌套對象
      if (typeof updated[key] === 'object' && updated[key] !== null) {
        const subResult = syncStructure(value, updated[key], currentPath);
        updated[key] = subResult.updated;
        fieldsAdded += subResult.fieldsAdded;
      } else {
        // 目標不是對象，需要重建
        updated[key] = createTranslationTemplate(value);
        const subFields = countFields(value);
        fieldsAdded += subFields;
        console.log(`[Sync] Rebuilt object: ${currentPath} (${subFields} fields)`);
      }
    }
  }
  
  return { updated, fieldsAdded };
}

// 計算對象中的欄位數量
function countFields(obj) {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      count += countFields(value);
    } else {
      count++;
    }
  }
  return count;
}

// 輔助函數
function getLanguageName(code) {
  const languageNames = {
    // 主流語系（無國家代碼）
    'zh': '中文 zh',
    'ja': '日本語 ja',
    'ko': '한국어 ko',
    'es': 'Español es',
    'fr': 'Français fr',
    'de': 'Deutsch de',
    'it': 'Italiano it',
    'pt': 'Português pt',
    'ru': 'Русский ru',
    'ar': 'العربية ar',
    
    // 基本語系（向後兼容）
    'en': 'English',
    'zh-TW': '繁體中文 zh-TW',
    'zh-CN': '简体中文 zh-CN',
    
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
    const child = spawn('node', [translatorPath, languageCode], {
      cwd: path.join(__dirname, '..')
    });

    child.stdout.on('data', (data) => {
      console.log(`[Auto Translate] ${data.toString()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[Auto Translate Error] ${data.toString()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Auto Translate] Successfully completed for ${languageCode}`);
        resolve();
      } else {
        console.error(`[Auto Translate] Failed with code ${code} for ${languageCode}`);
        reject(new Error(`Translation failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`[Auto Translate] Process error for ${languageCode}:`, error);
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