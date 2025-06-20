const fs = require('fs');
const path = require('path');

class TranslationValidator {
  constructor(baseDir = './translations') {
    this.baseDir = baseDir;
    this.baseLanguage = 'en';
    this.issues = [];
  }

  // 驗證所有語系
  validateAllLanguages() {
    if (!fs.existsSync(this.baseDir)) {
      console.log('❌ 翻譯資料夾不存在');
      return;
    }

    const languages = fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log('🔍 開始驗證所有語系...\n');

    languages.forEach(language => {
      if (language !== this.baseLanguage) {
        this.validateLanguage(language);
      }
    });

    this.printSummary();
  }

  // 驗證單一語系
  validateLanguage(languageCode) {
    console.log(`\n🌍 驗證語系: ${languageCode}`);
    console.log('─'.repeat(30));

    const baseDir = path.join(this.baseDir, this.baseLanguage);
    const targetDir = path.join(this.baseDir, languageCode);

    if (!fs.existsSync(targetDir)) {
      this.addIssue(languageCode, 'FATAL', '語系資料夾不存在');
      return;
    }

    const files = fs.readdirSync(baseDir);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        this.validateFile(languageCode, file);
      }
    });
  }

  // 驗證單一檔案
  validateFile(languageCode, filename) {
    const basePath = path.join(this.baseDir, this.baseLanguage, filename);
    const targetPath = path.join(this.baseDir, languageCode, filename);

    // 檢查檔案是否存在
    if (!fs.existsSync(targetPath)) {
      this.addIssue(languageCode, 'ERROR', `${filename} 檔案不存在`);
      return;
    }

    try {
      // 檢查 JSON 格式
      const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf8'));
      const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

      // 檢查結構一致性
      this.validateStructure(languageCode, filename, baseContent, targetContent);

      // 檢查翻譯品質
      this.validateTranslationQuality(languageCode, filename, baseContent, targetContent);

    } catch (error) {
      this.addIssue(languageCode, 'ERROR', `${filename} JSON 格式錯誤: ${error.message}`);
    }
  }

  // 驗證結構一致性
  validateStructure(languageCode, filename, baseContent, targetContent, path = '') {
    for (const [key, value] of Object.entries(baseContent)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in targetContent)) {
        this.addIssue(languageCode, 'ERROR', `${filename}: 缺少鍵值 "${currentPath}"`);
      } else if (typeof value === 'object' && value !== null) {
        if (typeof targetContent[key] !== 'object' || targetContent[key] === null) {
          this.addIssue(languageCode, 'ERROR', `${filename}: "${currentPath}" 類型不匹配`);
        } else {
          this.validateStructure(languageCode, filename, value, targetContent[key], currentPath);
        }
      }
    }
  }

  // 驗證翻譯品質
  validateTranslationQuality(languageCode, filename, baseContent, targetContent, path = '') {
    for (const [key, value] of Object.entries(baseContent)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key in targetContent) {
        const targetValue = targetContent[key];

        if (typeof value === 'string' && typeof targetValue === 'string') {
          // 檢查空值
          if (targetValue.trim() === '') {
            this.addIssue(languageCode, 'WARNING', `${filename}: "${currentPath}" 為空值`);
          }

          // 檢查是否直接複製英文
          if (targetValue === value && languageCode !== this.baseLanguage) {
            this.addIssue(languageCode, 'WARNING', `${filename}: "${currentPath}" 可能未翻譯`);
          }

          // 檢查變數插值
          this.validateInterpolation(languageCode, filename, currentPath, value, targetValue);

          // 檢查長度差異
          this.validateLength(languageCode, filename, currentPath, value, targetValue);
        }
      }
    }
  }

  // 驗證變數插值
  validateInterpolation(languageCode, filename, path, baseValue, targetValue) {
    const baseVars = this.extractVariables(baseValue);
    const targetVars = this.extractVariables(targetValue);

    // 檢查變數是否一致
    const missingVars = baseVars.filter(v => !targetVars.includes(v));
    const extraVars = targetVars.filter(v => !baseVars.includes(v));

    if (missingVars.length > 0) {
      this.addIssue(languageCode, 'ERROR', `${filename}: "${path}" 缺少變數: ${missingVars.join(', ')}`);
    }

    if (extraVars.length > 0) {
      this.addIssue(languageCode, 'WARNING', `${filename}: "${path}" 多餘變數: ${extraVars.join(', ')}`);
    }
  }

  // 提取變數
  extractVariables(text) {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  // 驗證長度
  validateLength(languageCode, filename, path, baseValue, targetValue) {
    const ratio = targetValue.length / baseValue.length;
    
    if (ratio < 0.3) {
      this.addIssue(languageCode, 'WARNING', `${filename}: "${path}" 翻譯可能過短 (${ratio.toFixed(2)})`);
    } else if (ratio > 3) {
      this.addIssue(languageCode, 'WARNING', `${filename}: "${path}" 翻譯可能過長 (${ratio.toFixed(2)})`);
    }
  }

  // 添加問題
  addIssue(languageCode, level, message) {
    this.issues.push({
      language: languageCode,
      level: level,
      message: message
    });
  }

  // 印出摘要
  printSummary() {
    console.log('\n📊 驗證摘要');
    console.log('─'.repeat(50));

    const errorCount = this.issues.filter(i => i.level === 'ERROR').length;
    const warningCount = this.issues.filter(i => i.level === 'WARNING').length;
    const fatalCount = this.issues.filter(i => i.level === 'FATAL').length;

    console.log(`❌ 錯誤: ${errorCount}`);
    console.log(`⚠️  警告: ${warningCount}`);
    console.log(`💥 致命錯誤: ${fatalCount}`);

    if (this.issues.length > 0) {
      console.log('\n📋 詳細問題:');
      console.log('─'.repeat(50));

      this.issues.forEach(issue => {
        const icon = issue.level === 'ERROR' ? '❌' : issue.level === 'WARNING' ? '⚠️' : '💥';
        console.log(`${icon} [${issue.language}] ${issue.message}`);
      });
    } else {
      console.log('\n✅ 沒有發現問題！');
    }
  }

  // 生成報告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.issues.length,
        errors: this.issues.filter(i => i.level === 'ERROR').length,
        warnings: this.issues.filter(i => i.level === 'WARNING').length,
        fatal: this.issues.filter(i => i.level === 'FATAL').length
      },
      issues: this.issues
    };

    const reportPath = path.join(this.baseDir, 'translation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 報告已生成: ${reportPath}`);
  }
}

// 使用範例
if (require.main === module) {
  const validator = new TranslationValidator();
  
  const command = process.argv[2];
  const language = process.argv[3];

  switch (command) {
    case 'validate':
      if (language) {
        validator.validateLanguage(language);
      } else {
        validator.validateAllLanguages();
      }
      validator.generateReport();
      break;
      
    default:
      console.log(`
翻譯驗證工具使用方式:

  node translation-validator.js validate [語系代碼]  # 驗證翻譯

範例:
  node translation-validator.js validate        # 驗證所有語系
  node translation-validator.js validate zh-TW  # 驗證特定語系
      `);
  }
}

module.exports = TranslationValidator; 