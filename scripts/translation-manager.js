const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

class TranslationManager {
  constructor(baseDir = './translations', sourceDir = './source') {
    this.baseDir = baseDir;
    this.sourceDir = sourceDir;
    this.baseLanguage = 'source';
  }

  // 創建新語系
  createLanguage(languageCode) {
    const targetDir = path.join(this.baseDir, languageCode);
    
    if (fs.existsSync(targetDir)) {
      console.log(`❌ 語系 ${languageCode} 已存在`);
      return false;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    
    // 複製基底檔案結構
    if (fs.existsSync(this.sourceDir)) {
      this.copyStructure(this.sourceDir, targetDir);
    } else {
      console.log(`⚠️  基底目錄不存在: ${this.sourceDir}`);
    }
    
    console.log(`✅ 語系 ${languageCode} 創建成功`);
    return true;
  }

  // 複製目錄結構
  copyStructure(sourceDir, targetDir) {
    const files = fs.readdirSync(sourceDir);
    
    files.forEach(file => {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        this.copyStructure(sourcePath, targetPath);
      } else if (file.endsWith('.json')) {
        const content = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        const emptyContent = this.createEmptyStructure(content);
        fs.writeFileSync(targetPath, JSON.stringify(emptyContent, null, 2), 'utf8');
      }
    });
  }

  // 創建空的翻譯結構
  createEmptyStructure(obj) {
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = '';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.createEmptyStructure(value);
      }
    }
    
    return result;
  }

  // 匯出 translations 資料夾為 ZIP
  async exportTranslations(outputPath = './translations-export.zip') {
    return new Promise((resolve, reject) => {
      console.log('🔄 正在匯出 translations 資料夾...');
      
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 壓縮等級
      });

      output.on('close', () => {
        const fileSize = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ 匯出完成！`);
        console.log(`📁 檔案位置: ${outputPath}`);
        console.log(`📊 檔案大小: ${fileSize} MB`);
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        console.error('❌ 匯出失敗:', err);
        reject(err);
      });

      archive.pipe(output);
      
      // 將整個 translations 資料夾加入壓縮檔
      archive.directory(this.baseDir, 'translations');
      
      archive.finalize();
    });
  }

  // 匯入 ZIP 並合併翻譯（保護基底語系）
  async importTranslations(zipPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 正在匯入 ${zipPath}...`);
      
      if (!fs.existsSync(zipPath)) {
        console.error(`❌ 檔案不存在: ${zipPath}`);
        reject(new Error('檔案不存在'));
        return;
      }

      const tempDir = './temp-import';
      const backupPath = `${this.baseDir}-backup-${Date.now()}`;
      
      // 備份現有的 translations 資料夾
      if (fs.existsSync(this.baseDir)) {
        console.log(`📦 備份現有資料到: ${backupPath}`);
        this.copyDirectory(this.baseDir, backupPath);
      }

      // 清理臨時資料夾
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // 解壓縮到臨時資料夾
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .on('close', () => {
          try {
            // 尋找解壓縮後的 translations 資料夾
            const extractedTranslationsPath = path.join(tempDir, 'translations');
            if (!fs.existsSync(extractedTranslationsPath)) {
              throw new Error('ZIP 檔案中找不到 translations 資料夾');
            }
            
            // 獲取所有語系資料夾
            const importedLanguages = fs.readdirSync(extractedTranslationsPath)
              .filter(item => {
                const itemPath = path.join(extractedTranslationsPath, item);
                return fs.statSync(itemPath).isDirectory();
              });
            
            console.log(`📂 發現語系: ${importedLanguages.join(', ')}`);
            
            // 確保 translations 資料夾存在
            if (!fs.existsSync(this.baseDir)) {
              fs.mkdirSync(this.baseDir, { recursive: true });
            }
            
            // 合併每個語系（跳過 en 基底語系）
            let importedCount = 0;
            for (const lang of importedLanguages) {
              // 🚨 重要：保護基底語系 en
              if (lang === 'en') {
                console.log(`⚠️  跳過基底語系 'en'，不允許覆蓋`);
                continue;
              }
              
              const sourceLangPath = path.join(extractedTranslationsPath, lang);
              const targetLangPath = path.join(this.baseDir, lang);
              
              console.log(`📋 處理語系: ${lang}`);
              
              // 確保目標語系資料夾存在
              if (!fs.existsSync(targetLangPath)) {
                fs.mkdirSync(targetLangPath, { recursive: true });
              }
              
              // 複製所有 JSON 檔案
              const files = fs.readdirSync(sourceLangPath)
                .filter(file => file.endsWith('.json'));
              
              for (const file of files) {
                const sourceFilePath = path.join(sourceLangPath, file);
                const targetFilePath = path.join(targetLangPath, file);
                
                console.log(`  📄 複製: ${lang}/${file}`);
                fs.copyFileSync(sourceFilePath, targetFilePath);
              }
              
              importedCount++;
            }
            
            // 清理臨時資料夾
            fs.rmSync(tempDir, { recursive: true, force: true });
            
            console.log('✅ 匯入完成！');
            console.log(`📁 已匯入 ${importedCount} 個語系（跳過基底語系 en）`);
            console.log(`💾 舊資料備份於: ${backupPath}`);
            resolve();
            
          } catch (error) {
            console.error('❌ 匯入處理失敗:', error);
            
            // 清理臨時資料夾
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
            
            reject(error);
          }
        })
        .on('error', (err) => {
          console.error('❌ 解壓縮失敗:', err);
          
          // 清理臨時資料夾
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
          
          reject(err);
        });
    });
  }

  // 輔助函數：複製資料夾
  copyDirectory(source, destination) {
    if (!fs.existsSync(source)) return;
    
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    const items = fs.readdirSync(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  // 列出所有語系
  listLanguages() {
    if (!fs.existsSync(this.baseDir)) {
      console.log('❌ translations 資料夾不存在');
      return [];
    }

    const languages = fs.readdirSync(this.baseDir)
      .filter(item => {
        const itemPath = path.join(this.baseDir, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .map(lang => ({
        code: lang,
        isBase: lang === this.baseLanguage,
        path: path.join(this.baseDir, lang)
      }));

    return languages;
  }

  // 顯示統計資訊
  showStats() {
    const languages = this.listLanguages();
    
    console.log('\n📊 翻譯統計資訊');
    console.log('='.repeat(50));
    
    languages.forEach(lang => {
      const files = this.getLanguageFiles(lang.code);
      console.log(`\n🌍 ${lang.code} ${lang.isBase ? '(基準語系)' : ''}`);
      console.log(`📁 檔案數量: ${files.length}`);
      
      if (files.length > 0) {
        let totalItems = 0;
        let translatedItems = 0;
        
        files.forEach(file => {
          const stats = this.getFileStats(lang.code, file);
          totalItems += stats.total;
          translatedItems += stats.translated;
        });
        
        const completeness = totalItems > 0 ? ((translatedItems / totalItems) * 100).toFixed(1) : 0;
        console.log(`📝 翻譯項目: ${translatedItems}/${totalItems}`);
        console.log(`✅ 完成度: ${completeness}%`);
      }
    });
    
    console.log('\n' + '='.repeat(50));
  }

  // 獲取語系檔案列表
  getLanguageFiles(languageCode) {
    const langDir = path.join(this.baseDir, languageCode);
    
    if (!fs.existsSync(langDir)) {
      return [];
    }
    
    return fs.readdirSync(langDir)
      .filter(file => file.endsWith('.json'))
      .sort();
  }

  // 獲取檔案統計
  getFileStats(languageCode, fileName) {
    const filePath = path.join(this.baseDir, languageCode, fileName);
    
    if (!fs.existsSync(filePath)) {
      return { total: 0, translated: 0, empty: 0 };
    }
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return this.analyzeContent(content);
    } catch (error) {
      console.error(`❌ 讀取檔案失敗: ${filePath}`, error.message);
      return { total: 0, translated: 0, empty: 0 };
    }
  }

  // 分析內容統計
  analyzeContent(obj, stats = { total: 0, translated: 0, empty: 0 }) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        stats.total++;
        if (value.trim()) {
          stats.translated++;
        } else {
          stats.empty++;
        }
      } else if (typeof value === 'object' && value !== null) {
        this.analyzeContent(value, stats);
      }
    }
    
    return stats;
  }
}

// CLI 介面
async function main() {
  const args = process.argv.slice(2);
  const manager = new TranslationManager();
  
  if (args.length === 0) {
    console.log(`
🌍 翻譯管理工具

使用方法:
  node scripts/translation-manager.js <命令> [參數]

命令:
  create <語系代碼>           創建新語系
  list                       列出所有語系
  stats                      顯示統計資訊
  export [檔案路徑]           匯出 translations 資料夾為 ZIP
  import <ZIP檔案路徑>        匯入 ZIP 並取代 translations 資料夾

範例:
  node scripts/translation-manager.js create zh-tw
  node scripts/translation-manager.js export
  node scripts/translation-manager.js export ./backup/translations-20241201.zip
  node scripts/translation-manager.js import ./translations-backup.zip
  node scripts/translation-manager.js stats
`);
    return;
  }

  const command = args[0];
  
  try {
    switch (command) {
      case 'create':
        if (args.length < 2) {
          console.log('❌ 請指定語系代碼');
          console.log('範例: node scripts/translation-manager.js create zh-tw');
          return;
        }
        manager.createLanguage(args[1]);
        break;
        
      case 'list':
        const languages = manager.listLanguages();
        console.log('\n🌍 可用語系:');
        languages.forEach(lang => {
          console.log(`  ${lang.code} ${lang.isBase ? '(基準語系)' : ''}`);
        });
        break;
        
      case 'stats':
        manager.showStats();
        break;
        
      case 'export':
        const exportPath = args[1] || './translations-export.zip';
        await manager.exportTranslations(exportPath);
        break;
        
      case 'import':
        if (args.length < 2) {
          console.log('❌ 請指定 ZIP 檔案路徑');
          console.log('範例: node scripts/translation-manager.js import ./translations-backup.zip');
          return;
        }
        await manager.importTranslations(args[1]);
        break;
        
      default:
        console.log(`❌ 未知命令: ${command}`);
        console.log('執行 node scripts/translation-manager.js 查看可用命令');
    }
  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TranslationManager; 