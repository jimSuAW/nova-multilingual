# Nova 翻譯管理系統

專門用來管理 Nova 的前端翻譯包的系統，各專案可部署至該專案的 Zeabur 上，並依照此教學文件來進行多語系管理

## 📋 功能特色

- **🎯 Web 管理介面** - 直觀的翻譯管理和編輯器
- **🚀 智慧自動翻譯** - 整合 Google Translate API 高品質翻譯
- **⚡ 快速處理** - 英文語系直接複製，其他語系 API 翻譯
- **📊 即時統計** - 翻譯進度追蹤和完成度統計
- **🔄 批次管理** - 一鍵新增語系和批次翻譯
- **📦 匯出入功能** - ZIP 格式翻譯包匯出入

## 🚀 快速開始

### 1. 安裝與啟動

```bash
# 安裝依賴
npm install

# 啟動 Web 應用程式
cd web-app && npm start
```

訪問 http://localhost:3001 開始使用

### 2. Google Translate API 設定（可選）

如需使用自動翻譯功能，請設定 Google Translate API：

```bash
# 建立 .env 檔案
echo "GOOGLE_TRANSLATE_API_KEY=your_api_key_here" > .env
```

**取得 API 金鑰：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 啟用 Cloud Translation API
3. 建立 API 金鑰
4. 複製金鑰到 .env 檔案

> 💡 Google Translate API 每月前 50 萬字元免費

## 🎮 使用方式

### Web 介面操作

1. **新增語系** - 點擊「新增語系」選擇目標語言
2. **自動翻譯** - 對任何語系執行一鍵自動翻譯
3. **手動編輯** - 使用編輯器精細調整翻譯內容
4. **進度追蹤** - 查看各語系翻譯完成度統計
5. **匯出翻譯包** - 下載完整的翻譯檔案 ZIP

### 命令列操作

```bash
# 自動翻譯到指定語系
node scripts/auto-translator.js ja        # 日文
node scripts/auto-translator.js zh-Hant-TW # 繁體中文
node scripts/auto-translator.js ko        # 韓文

# 管理翻譯檔案
node scripts/translation-manager.js create zh-TW
node scripts/translation-validator.js zh-TW
```

## 📁 專案結構

```
novaMultilingual/
├── source/                    # 基底翻譯檔案（英文）
│   ├── account.json
│   ├── product.json
│   └── ...
├── translations/              # 翻譯檔案資料夾
│   ├── ja/                   # 日文翻譯
│   ├── zh-Hant-TW/          # 繁體中文翻譯
│   └── ...
├── web-app/                   # Web 應用程式
│   ├── server.js             # Express 後端伺服器
│   └── client/               # React 前端
├── scripts/                   # 命令列工具
│   ├── auto-translator.js    # 自動翻譯引擎
│   ├── translation-manager.js # 翻譯管理工具
│   └── translation-validator.js # 翻譯驗證工具
└── package.json
```

## 🌍 支援語系

支援 Google Translate API 的所有語言，包括：

| 語言 | 代碼 | 語言 | 代碼 |
|------|------|------|------|
| 英文 | `en` | 繁體中文 | `zh-Hant-TW` |
| 簡體中文 | `zh-Hans-CN` | 日文 | `ja` |
| 韓文 | `ko` | 法文 | `fr` |
| 德文 | `de` | 西班牙文 | `es` |
| 葡萄牙文 | `pt` | 義大利文 | `it` |
| 俄文 | `ru` | 阿拉伯文 | `ar` |

## ⚙️ 翻譯機制

### 英文語系
- 自動檢測英文相關語系（`en`, `en-US`, `en-GB`, `en-AU` 等）
- 直接從 `source/` 資料夾複製內容
- 處理時間：1-2 秒

### 其他語系
- 使用 Google Translate API 進行翻譯
- 從 `source/` 英文內容翻譯到目標語言
- 處理時間：5-60 秒（依內容量而定）


## 🔧 設定說明

### 環境變數（可選）

```bash
# Google Translate API
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Web 應用程式
PORT=3001
NODE_ENV=development
```

### 檔案結構要求

翻譯檔案必須為 JSON 格式，支援巢狀結構：

```json
{
  "account": {
    "heading": "Account Center",
    "login": "Login",
    "logout": "Logout"
  },
  "product": {
    "title": "Product Name",
    "description": "Product Description"
  }
}
```

## 🛠️ 開發與部署

### 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
cd web-app && npm start

# 開發模式（前端）
cd web-app/client && npm start
```

### 部署到 Zeabur

專案已配置 Zeabur 部署設定，只需：

1. 連接 GitHub 倉庫到 Zeabur
2. 設定環境變數（如需 Google Translate API）
3. 一鍵部署

## 📞 技術支援

如遇問題請檢查：

1. **無法啟動** - 確認 Node.js 版本 >= 16
2. **翻譯失敗** - 檢查 Google Translate API 金鑰設定
3. **檔案格式錯誤** - 確認 JSON 格式正確性
4. **埠號衝突** - 修改 PORT 環境變數

## 📄 授權條款

MIT License - 可自由使用於商業和個人專案

---

**🎯 適用場景**
- 多語系網站/應用程式開發
- 電商平台國際化
- 內容管理系統翻譯
- 企業內部文件翻譯管理 