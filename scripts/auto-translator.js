const fs = require('fs');
const path = require('path');
const https = require('https');

class AutoTranslator {
  constructor(baseDir = './translations', sourceDir = './source') {
    this.baseDir = baseDir;
    this.sourceDir = sourceDir;
    this.baseLanguage = 'source';
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

  // GCP Cloud Translation API (主要引擎) - 直接翻譯版
  async translateWithGCP(texts, targetLang) {
    if (!this.gcpConfig.apiKey) {
      throw new Error('Google Cloud Translation API key not configured');
    }

    return new Promise((resolve, reject) => {
      // 直接翻譯，不添加上下文（問題太多）
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

  // 精準翻譯字典 - 直接對應
  getDirectTranslation(text, targetLang) {
    const directTranslations = {
      'zh-Hant-TW': {
        'Male': '男性',
        'Female': '女性',
        'Other': '其他',
        'Mr.': '先生',
        'Ms.': '女士',
        'Mrs.': '太太',
        'Mx.': '',
        'Dr.': '博士',
        'Prof.': '教授',
        'Email': '電子郵件',
        'Phone': '電話',
        'Birth': '生日',
        'Gender': '性別',
        'Password': '密碼',
        'Account': '帳戶',
        'Member': '會員',
        'Logout': '登出',
        'Login': '登入',
        'Newsletter': '電子報',
        'Newsletters': '電子報'
      },
      'zh-CN': {
        'Male': '男性',
        'Female': '女性',
        'Other': '其他',
        'Mr.': '先生',
        'Ms.': '女士',
        'Mrs.': '太太',
        'Mx.': '',
        'Dr.': '博士',
        'Prof.': '教授',
        'Email': '邮件',
        'Phone': '电话',
        'Birth': '生日',
        'Gender': '性别',
        'Password': '密码',
        'Account': '账户',
        'Member': '会员',
        'Logout': '登出',
        'Login': '登录',
        'Newsletter': '电子报',
        'Newsletters': '电子报'
      },
      'ja': {
        'Male': '男性',
        'Female': '女性',
        'Other': 'その他',
        'Mr.': '様',
        'Ms.': '様',
        'Mrs.': '様',
        'Mx.': '様',
        'Dr.': '博士',
        'Prof.': '教授',
        'Email': 'メール',
        'Phone': '電話',
        'Birth': '生年月日',
        'Gender': '性別',
        'Password': 'パスワード',
        'Account': 'アカウント',
        'Member': 'メンバー',
        'Logout': 'ログアウト',
        'Login': 'ログイン',
        'Newsletter': 'ニュースレター',
        'Newsletters': 'ニュースレター'
      }
    };
    
    const translations = directTranslations[targetLang] || {};
    return translations[text] || null;
  }

  // 翻譯驗證和修正 - 優先使用精準字典
  validateAndCorrectTranslation(originalText, translation, targetLang) {
    if (!translation) return translation;
    
    // 第一優先：使用精準翻譯字典
    const directTranslation = this.getDirectTranslation(originalText, targetLang);
    if (directTranslation !== null) {
      console.log(`✅ 使用精準字典: "${originalText}" -> "${directTranslation}"`);
      return directTranslation;
    }
    
    // 第二優先：修正常見的錯誤翻譯
    const corrections = {
      'zh-Hant-TW': {
        '多發性硬化症': '女士',
        '微軟': '女士',
        '毫秒': '女士',
        '先生稱號': '先生',
        '女士稱號': '女士',
        '太太稱號': '太太',
        '性別 男': '男性',
        '性別 女': '女性',
        '性別男': '男性',
        '性別女': '女性',
        '時事通訊': '電子報',
        '通訊': '電子報',
        '帳號': '帳戶',
        '賬戶': '帳戶',
        '邮件': '電子郵件',
        '电话': '電話',
        '密码': '密碼',
        '登录': '登入',
        '注册': '註冊',
      },
      'zh-CN': {
        '多发性硬化症': '女士',
        '微软': '女士',
        '毫秒': '女士',
        '先生称号': '先生',
        '女士称号': '女士',
        '太太称号': '太太',
        '性别 男': '男性',
        '性别 女': '女性',
        '性别男': '男性',
        '性别女': '女性',
        '時事通訊': '新闻简报',
        '帳戶': '账户',
        '電子郵件': '邮件',
        '電話': '电话',
        '密碼': '密码',
      },
      'ja': {
        '多発性硬化症': '様',
        'マイクロソフト': '様',
        'ミリ秒': '様',
        'ニュースレター': 'メールマガジン',
      }
    };
    
    // 套用修正
    const langCorrections = corrections[targetLang] || {};
    let correctedTranslation = translation;
    
    for (const [wrong, correct] of Object.entries(langCorrections)) {
      if (correctedTranslation.includes(wrong)) {
        correctedTranslation = correctedTranslation.replace(wrong, correct);
        console.log(`🔧 修正翻譯: "${wrong}" -> "${correct}"`);
      }
    }
    
    return correctedTranslation;
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
    const fullPath = path.join(this.sourceDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ 基底檔案不存在: ${fullPath}`);
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
    let correctedCount = 0;

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
        let translation = translations[i];
        
        if (translation && translation !== item.text) {
          // 驗證和修正翻譯結果
          const correctedTranslation = this.validateAndCorrectTranslation(item.text, translation, targetLang);
          if (correctedTranslation !== translation) {
            console.log(`🔧 修正翻譯: "${item.text}" -> "${translation}" -> "${correctedTranslation}"`);
            translation = correctedTranslation;
            correctedCount++;
          }
          
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
    console.log(`📊 成功: ${successCount}, 失敗: ${failCount}, 修正: ${correctedCount}, 成功率: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
  }

  // 翻譯整個語言
  async translateLanguage(targetLang) {
    if (!fs.existsSync(this.sourceDir)) {
      console.log(`❌ 基底目錄不存在: ${this.sourceDir}`);
      return;
    }

    const files = fs.readdirSync(this.sourceDir).filter(file => file.endsWith('.json'));
    
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