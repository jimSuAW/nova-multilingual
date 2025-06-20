const fs = require('fs');
const path = require('path');
const https = require('https');

class AutoTranslator {
  constructor(baseDir = './translations') {
    this.baseDir = baseDir;
    this.baseLanguage = 'en';
  }

  // 使用免費翻譯 API (MyMemory)
  async translateWithFreeAPI(text, targetLang) {
    return new Promise((resolve) => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.responseStatus === 200) {
              resolve(result.responseData.translatedText);
            } else {
              console.log(`⚠️  翻譯失敗: ${text}`);
              resolve(text); // 返回原文
            }
          } catch (error) {
            console.log(`⚠️  翻譯錯誤: ${text}`);
            resolve(text); // 返回原文
          }
        });
      }).on('error', (error) => {
        console.log(`⚠️  翻譯錯誤: ${text}`);
        resolve(text); // 返回原文
      });
    });
  }

  // 遞歸翻譯對象
  async translateObject(obj, targetLang, baseObj = null, currentPath = '') {
    const translatedObj = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        // 遞歸翻譯嵌套對象
        const baseValue = baseObj ? baseObj[key] : null;
        translatedObj[key] = await this.translateObject(value, targetLang, baseValue, newPath);
      } else {
        // 翻譯字符串值
        if (value === '' && baseObj && baseObj[key]) {
          // 空值且有對應的基準語系文本，進行翻譯
          try {
            const translatedText = await this.translateWithFreeAPI(baseObj[key], targetLang);
            
            console.log(`🔄 翻譯: "${baseObj[key]}" → "${translatedText}"`);
            translatedObj[key] = translatedText;
            
            // 延遲避免 API 限制
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.log(`❌ 翻譯失敗: ${baseObj[key]}`);
            translatedObj[key] = value; // 保持原值
          }
        } else {
          translatedObj[key] = value; // 保持原值
        }
      }
    }
    
    return translatedObj;
  }

  // 翻譯整個語系
  async translateLanguage(targetLanguage) {
    const baseDir = path.join(this.baseDir, this.baseLanguage);
    const targetDir = path.join(this.baseDir, targetLanguage);
    
    if (!fs.existsSync(baseDir)) {
      console.error(`❌ 基準語系資料夾不存在: ${this.baseLanguage}`);
      return;
    }

    if (!fs.existsSync(targetDir)) {
      console.error(`❌ 目標語系資料夾不存在: ${targetLanguage}`);
      return;
    }

    console.log(`🚀 開始自動翻譯 ${targetLanguage}...`);
    console.log(`⚠️  使用免費翻譯服務，可能有 API 限制`);
    
    const files = fs.readdirSync(baseDir);
    let totalFiles = 0;
    let translatedFiles = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        totalFiles++;
        const basePath = path.join(baseDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (!fs.existsSync(targetPath)) {
          console.log(`⚠️  跳過不存在的文件: ${targetLanguage}/${file}`);
          continue;
        }

        try {
          console.log(`\n📝 翻譯文件: ${file}`);
          
          const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf8'));
          const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
          
          // 翻譯目標內容
          const translatedContent = await this.translateObject(targetContent, targetLanguage, baseContent);
          
          // 寫入翻譯後的文件
          fs.writeFileSync(targetPath, JSON.stringify(translatedContent, null, 2));
          
          console.log(`✅ 完成翻譯: ${file}`);
          translatedFiles++;
          
        } catch (error) {
          console.error(`❌ 翻譯文件失敗: ${file}`, error.message);
        }
      }
    }

    console.log(`\n🎉 翻譯完成！處理了 ${translatedFiles}/${totalFiles} 個文件`);
  }

  // 獲取語言代碼映射
  getLanguageCode(language) {
    const languageMap = {
      'zh-TW': 'zh-TW',
      'zh-CN': 'zh-CN',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru'
    };
    
    return languageMap[language] || language;
  }
}

// 使用範例
if (require.main === module) {
  const translator = new AutoTranslator();
  
  const command = process.argv[2];
  const language = process.argv[3];

  async function main() {
    switch (command) {
      case 'translate':
        if (!language) {
          console.log('請指定語系代碼，例如: node auto-translator.js translate zh-TW');
          break;
        }
        await translator.translateLanguage(language);
        break;
        
      default:
        console.log(`
自動翻譯工具使用方式:

  node auto-translator.js translate <語系代碼>  # 自動翻譯指定語系

範例:
  node auto-translator.js translate zh-TW
  node auto-translator.js translate zh-CN
  node auto-translator.js translate ja

注意:
  - 需要先運行 npm run translation:create <語系代碼> 創建翻譯文件
  - 使用免費的 MyMemory 翻譯服務
  - 有 API 限制，翻譯大量內容時請耐心等待
        `);
    }
  }

  main().catch(console.error);
}

module.exports = AutoTranslator; 