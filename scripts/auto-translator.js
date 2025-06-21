const fs = require('fs');
const path = require('path');
const https = require('https');

class AutoTranslator {
  constructor(baseDir = './translations') {
    this.baseDir = baseDir;
    this.baseLanguage = 'en';
    this.batchSize = 25; // GCP 支援批次翻譯
    this.maxConcurrent = 6; // 增加並行數
    this.delayMs = 30; // 更低延遲
    
    // GCP Cloud Translation 配置
    this.gcpConfig = {
      apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'default-project',
      endpoint: 'https://translation.googleapis.com'
    };
    
    // 備用翻譯引擎
    this.fallbackEngines = ['gcp', 'mymemory', 'libre'];
    this.currentEngine = 'gcp';
  }

  // GCP Cloud Translation API (主要引擎)
  async translateWithGCP(texts, targetLang) {
    if (!this.gcpConfig.apiKey) {
      throw new Error('Google Cloud Translation API key not configured');
    }

    return new Promise((resolve, reject) => {
      // 準備批次翻譯請求
      const body = {
        q: texts,
        source: 'en',
        target: targetLang,
        format: 'text'
      };
      const postData = JSON.stringify(body);
      
      const options = {
        hostname: 'translation.googleapis.com',
        port: 443,
        path: `/language/translate/v2?key=${this.gcpConfig.apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              if (result.data && result.data.translations) {
                const translations = result.data.translations.map(item => 
                  item.translatedText || null
                );
                resolve(translations);
              } else {
                console.error('GCP API unexpected response format:', result);
                resolve(texts.map(() => null));
              }
            } else {
              console.error(`GCP API Error: ${res.statusCode} - ${data}`);
              resolve(texts.map(() => null));
            }
          } catch (error) {
            console.error('GCP API JSON parsing error:', error);
            resolve(texts.map(() => null));
          }
        });
      });

      req.on('error', (error) => {
        console.error('GCP API request error:', error);
        resolve(texts.map(() => null));
      });

      req.write(postData);
      req.end();
    });
  }

  // MyMemory API (備用)
  async translateWithMyMemory(text, targetLang) {
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
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      }).on('error', () => {
        resolve(null);
      });
    });
  }

  // LibreTranslate API (備用)
  async translateWithLibre(text, targetLang) {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text'
      });

      const options = {
        hostname: 'libretranslate.com',
        port: 443,
        path: '/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result.translatedText);
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      });

      req.on('error', () => {
        resolve(null);
      });

      req.write(postData);
      req.end();
    });
  }

  // 智慧翻譯引擎選擇
  async translateBatch(texts, targetLang) {
    let results = [];
    
    try {
      // 首先嘗試 GCP（如果配置了）
      if (this.gcpConfig.apiKey && this.currentEngine === 'gcp') {
        console.log(`🔄 使用 Google Cloud Translation 翻譯 ${texts.length} 個項目...`);
        results = await this.translateWithGCP(texts, targetLang);
        
        // 檢查成功率
        const successCount = results.filter(r => r !== null).length;
        const successRate = successCount / texts.length;
        
        console.log(`✅ Google 翻譯成功率: ${(successRate * 100).toFixed(1)}%`);
        
        if (successRate > 0.8) { // 80% 以上成功率
          return results;
        } else {
          console.log('⚠️  Google 成功率過低，切換到備用引擎');
          this.currentEngine = 'mymemory';
        }
      }
      
      // 備用方案：逐個翻譯
      console.log(`🔄 使用備用引擎翻譯 ${texts.length} 個項目...`);
      results = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        let translation = null;
        
        // 嘗試多個引擎
        for (const engine of ['mymemory', 'libre']) {
          try {
            if (engine === 'mymemory') {
              translation = await this.translateWithMyMemory(text, targetLang);
            } else if (engine === 'libre') {
              translation = await this.translateWithLibre(text, targetLang);
            }
            
            if (translation) {
              console.log(`✅ ${engine} 翻譯成功: ${text.substring(0, 30)}...`);
              break;
            }
          } catch (error) {
            console.log(`❌ ${engine} 翻譯失敗: ${error.message}`);
          }
        }
        
        results.push(translation);
        
        // 延遲以避免頻率限制
        if (i < texts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.delayMs * 2));
        }
      }
      
    } catch (error) {
      console.error('批次翻譯錯誤:', error);
      return texts.map(() => null);
    }
    
    return results;
  }

  // 延遲函數
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 翻譯單個檔案
  async translateFile(filePath, targetLang) {
    const fullPath = path.join(this.baseDir, this.baseLanguage, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ 檔案不存在: ${fullPath}`);
      return;
    }

    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    // 收集所有需要翻譯的文字
    const items = [];
    const collectItems = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          items.push({ path: currentPath, text: value });
        } else if (typeof value === 'object' && value !== null) {
          collectItems(value, currentPath);
        }
      }
    };
    
    collectItems(content);
    console.log(`📝 檔案 ${filePath} 包含 ${items.length} 個翻譯項目`);

    if (items.length === 0) {
      console.log('📝 沒有需要翻譯的內容');
      return;
    }

    // 分批處理
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    console.log(`🔄 將分成 ${batches.length} 批次處理`);

    // 並行處理批次
    const batchPromises = batches.map(async (batch, batchIndex) => {
      const texts = batch.map(item => item.text);
      
      console.log(`🔄 處理批次 ${batchIndex + 1}/${batches.length} (${texts.length} 個項目)`);
      
      const translations = await this.translateBatch(texts, targetLang);
      
      // 添加延遲以避免頻率限制
      if (batchIndex < batches.length - 1) {
        await this.delay(this.delayMs);
      }
      
      return { batch, translations, batchIndex };
    });

    // 限制並行數量
    const results = [];
    for (let i = 0; i < batchPromises.length; i += this.maxConcurrent) {
      const currentBatch = batchPromises.slice(i, i + this.maxConcurrent);
      const batchResults = await Promise.all(currentBatch);
      results.push(...batchResults);
      
      // 批次間延遲
      if (i + this.maxConcurrent < batchPromises.length) {
        await this.delay(this.delayMs);
      }
    }

    // 應用翻譯結果
    const translatedContent = JSON.parse(JSON.stringify(content));
    let successCount = 0;
    let failCount = 0;

    const setNestedValue = (obj, path, value) => {
      const keys = path.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
    };

    for (const { batch, translations } of results) {
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const translation = translations[i];
        
        if (translation && translation !== item.text) {
          setNestedValue(translatedContent, item.path, translation);
          successCount++;
        } else {
          failCount++;
          console.log(`❌ 翻譯失敗: ${item.text.substring(0, 50)}...`);
        }
      }
    }

    // 儲存翻譯結果
    const targetDir = path.join(this.baseDir, targetLang);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.join(targetDir, filePath);
    fs.writeFileSync(outputPath, JSON.stringify(translatedContent, null, 2), 'utf8');
    
    console.log(`✅ 翻譯完成: ${outputPath}`);
    console.log(`📊 成功: ${successCount}, 失敗: ${failCount}, 成功率: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
  }

  // 翻譯整個語言
  async translateLanguage(targetLang) {
    const sourceDir = path.join(this.baseDir, this.baseLanguage);
    
    if (!fs.existsSync(sourceDir)) {
      console.log(`❌ 來源目錄不存在: ${sourceDir}`);
      return;
    }

    const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('❌ 沒有找到 JSON 檔案');
      return;
    }

    console.log(`🌍 開始翻譯到 ${targetLang}`);
    console.log(`📁 找到 ${files.length} 個檔案`);
    console.log(`🔧 使用引擎: ${this.currentEngine}`);
    console.log(`⚙️  批次大小: ${this.batchSize}, 並行數: ${this.maxConcurrent}`);

    const startTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📄 [${i + 1}/${files.length}] 處理檔案: ${file}`);
      
      try {
        await this.translateFile(file, targetLang);
      } catch (error) {
        console.error(`❌ 翻譯檔案 ${file} 時發生錯誤:`, error);
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`\n🎉 翻譯完成！`);
    console.log(`⏱️  總耗時: ${duration} 秒`);
    console.log(`📊 平均每檔案: ${Math.round(duration / files.length)} 秒`);
  }
}

// CLI 介面
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🌍 自動翻譯工具 (Google Cloud Translation)

使用方法:
  node scripts/auto-translator.js <目標語言>

範例:
  node scripts/auto-translator.js ja     # 翻譯到日文
  node scripts/auto-translator.js zh-tw # 翻譯到繁體中文
  node scripts/auto-translator.js ko    # 翻譯到韓文

環境變數配置:
  GOOGLE_TRANSLATE_API_KEY=your_api_key
  GOOGLE_CLOUD_PROJECT_ID=your_project_id (可選)

支援的語言代碼:
  ja (日文), zh-tw (繁體中文), zh-cn (簡體中文), 
  ko (韓文), fr (法文), de (德文), es (西班牙文),
  pt (葡萄牙文), it (義大利文), ru (俄文) 等...
`);
    return;
  }

  const targetLang = args[0];
  const translator = new AutoTranslator();
  
  // 檢查配置
  if (!translator.gcpConfig.apiKey) {
    console.log(`
❌ 未配置 Google Cloud Translation API 金鑰

請設定環境變數:
  export GOOGLE_TRANSLATE_API_KEY="your_api_key"

或建立 .env 檔案:
  GOOGLE_TRANSLATE_API_KEY=your_api_key

如何獲取 API 金鑰:
1. 前往 Google Cloud Console: https://console.cloud.google.com
2. 啟用 Cloud Translation API
3. 建立 API 金鑰
4. 複製金鑰並設定環境變數

💡 每月前 50 萬字元免費！
`);
    return;
  }

  console.log('🚀 開始翻譯...');
  await translator.translateLanguage(targetLang);
}

// 如果直接執行此檔案
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AutoTranslator; 