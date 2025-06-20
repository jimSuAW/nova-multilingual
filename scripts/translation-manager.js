const fs = require('fs');
const path = require('path');

class TranslationManager {
  constructor(baseDir = './translations') {
    this.baseDir = baseDir;
    this.baseLanguage = 'en';
  }

  // 建立新的語系資料夾
  createLanguageFolder(languageCode) {
    const languageDir = path.join(this.baseDir, languageCode);
    
    if (!fs.existsSync(languageDir)) {
      fs.mkdirSync(languageDir, { recursive: true });
      console.log(`✅ 已建立語系資料夾: ${languageCode}`);
    } else {
      console.log(`⚠️  語系資料夾已存在: ${languageCode}`);
    }
    
    return languageDir;
  }

  // 複製基準語系檔案到新語系
  copyBaseLanguageFiles(targetLanguage) {
    const baseDir = path.join(this.baseDir, this.baseLanguage);
    const targetDir = path.join(this.baseDir, targetLanguage);
    
    if (!fs.existsSync(baseDir)) {
      console.error(`❌ 基準語系資料夾不存在: ${this.baseLanguage}`);
      return;
    }

    const files = fs.readdirSync(baseDir);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(baseDir, file);
        const targetPath = path.join(targetDir, file);
        
        // 讀取基準語系檔案
        const baseContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        
        // 建立翻譯模板（將所有值設為空字串）
        const translationTemplate = this.createTranslationTemplate(baseContent);
        
        // 寫入目標語系檔案
        fs.writeFileSync(targetPath, JSON.stringify(translationTemplate, null, 2));
        console.log(`📝 已建立翻譯模板: ${targetLanguage}/${file}`);
      }
    });
  }

  // 建立翻譯模板
  createTranslationTemplate(obj) {
    const template = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        template[key] = this.createTranslationTemplate(value);
      } else {
        template[key] = ''; // 空字串，等待翻譯
      }
    }
    
    return template;
  }

  // 檢查翻譯完整性
  checkTranslationCompleteness(languageCode) {
    const baseDir = path.join(this.baseDir, this.baseLanguage);
    const targetDir = path.join(this.baseDir, languageCode);
    
    if (!fs.existsSync(targetDir)) {
      console.error(`❌ 語系資料夾不存在: ${languageCode}`);
      return;
    }

    const files = fs.readdirSync(baseDir);
    let totalKeys = 0;
    let missingKeys = 0;
    let emptyKeys = 0;

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const basePath = path.join(baseDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (!fs.existsSync(targetPath)) {
          console.log(`❌ 缺少檔案: ${languageCode}/${file}`);
          return;
        }

        const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf8'));
        const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

        const result = this.compareTranslations(baseContent, targetContent);
        totalKeys += result.total;
        missingKeys += result.missing;
        emptyKeys += result.empty;

        if (result.missing > 0 || result.empty > 0) {
          console.log(`📊 ${file}: 缺少 ${result.missing} 個鍵值, 空值 ${result.empty} 個`);
        }
      }
    });

    const completionRate = ((totalKeys - missingKeys - emptyKeys) / totalKeys * 100).toFixed(1);
    console.log(`\n📈 ${languageCode} 翻譯完成度: ${completionRate}%`);
    console.log(`   總鍵值: ${totalKeys}, 缺少: ${missingKeys}, 空值: ${emptyKeys}`);
  }

  // 比較翻譯檔案
  compareTranslations(base, target, path = '') {
    let total = 0;
    let missing = 0;
    let empty = 0;

    for (const [key, value] of Object.entries(base)) {
      const currentPath = path ? `${path}.${key}` : key;
      total++;

      if (!(key in target)) {
        missing++;
        console.log(`  ❌ 缺少鍵值: ${currentPath}`);
      } else if (typeof value === 'object' && value !== null) {
        const result = this.compareTranslations(value, target[key], currentPath);
        total += result.total - 1; // 減1因為我們已經計算了這個鍵
        missing += result.missing;
        empty += result.empty;
      } else if (target[key] === '' || target[key] === null || target[key] === undefined) {
        empty++;
        console.log(`  ⚠️  空值: ${currentPath}`);
      }
    }

    return { total, missing, empty };
  }

  // 列出所有語系
  listLanguages() {
    if (!fs.existsSync(this.baseDir)) {
      console.log('❌ 翻譯資料夾不存在');
      return;
    }

    const languages = fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log('🌍 現有語系:');
    languages.forEach(lang => {
      const isBase = lang === this.baseLanguage;
      console.log(`  ${isBase ? '⭐' : '  '} ${lang}${isBase ? ' (基準語系)' : ''}`);
    });
  }
}

// 使用範例
if (require.main === module) {
  const manager = new TranslationManager();
  
  const command = process.argv[2];
  const language = process.argv[3];

  switch (command) {
    case 'create':
      if (!language) {
        console.log('請指定語系代碼，例如: node translation-manager.js create zh-TW');
        break;
      }
      manager.createLanguageFolder(language);
      manager.copyBaseLanguageFiles(language);
      break;
      
    case 'check':
      if (!language) {
        console.log('請指定語系代碼，例如: node translation-manager.js check zh-TW');
        break;
      }
      manager.checkTranslationCompleteness(language);
      break;
      
    case 'list':
      manager.listLanguages();
      break;
      
    default:
      console.log(`
翻譯管理工具使用方式:

  node translation-manager.js create <語系代碼>  # 建立新語系
  node translation-manager.js check <語系代碼>   # 檢查翻譯完整性
  node translation-manager.js list              # 列出所有語系

範例:
  node translation-manager.js create zh-TW
  node translation-manager.js check zh-TW
      `);
  }
}

module.exports = TranslationManager; 