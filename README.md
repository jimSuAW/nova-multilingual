# Nova Multilingual

一個現代化的多語系翻譯管理系統，提供直觀的 Web 介面讓使用者輕鬆管理翻譯文件。

## 功能特色

- 🌐 支援 20+ 種主流語言
- 📊 即時翻譯統計與進度追蹤
- 🤖 自動翻譯功能（基於 MyMemory API）
- 📁 檔案式翻譯管理
- 💾 翻譯包匯出功能
- 🎨 現代化 React 介面
- 📱 響應式設計

## 技術架構

- **後端**: Node.js + Express
- **前端**: React + React Router
- **翻譯 API**: MyMemory Translation API
- **部署**: 支援 Zeabur、Vercel、Railway 等平台

## 快速開始

### 本地開發

```bash
# 克隆專案
git clone https://github.com/your-username/nova-multilingual.git
cd nova-multilingual

# 安裝依賴
cd web-app
npm install
cd client
npm install

# 啟動開發伺服器
cd ..
npm start
```

### 部署到 Zeabur

1. Fork 此專案到你的 GitHub
2. 在 Zeabur 中連接你的 GitHub 帳號
3. 選擇 `nova-multilingual` 專案
4. 設定環境變數（可選）：
   - `PORT`: 伺服器埠號（預設 3001）
   - `TRANSLATIONS_DIR`: 翻譯檔案目錄（預設 ./translations）

## 支援語系

- 繁體中文 (台灣)
- 簡體中文 (中國)
- 西班牙語、法語、德語
- 日語、韓語、葡萄牙語
- 俄語、義大利語、阿拉伯語
- 印地語、土耳其語、波蘭語
- 越南語、泰語、荷蘭語
- 瑞典語、丹麥語、芬蘭語

## 專案結構

```
nova-multilingual/
├── translations/          # 翻譯檔案目錄
│   └── en/               # 基準語系（英文）
├── scripts/              # 翻譯腳本
│   ├── auto-translator.js
│   ├── translation-manager.js
│   └── translation-validator.js
├── web-app/              # Web 應用程式
│   ├── server.js         # 後端伺服器
│   ├── client/           # React 前端
│   └── package.json
└── package.json
```

## API 端點

- `GET /` - 主頁面
- `GET /api/languages` - 獲取語系列表
- `GET /api/languages/:lang/files` - 獲取語系檔案
- `GET /api/languages/:lang/stats` - 獲取翻譯統計
- `POST /api/languages` - 新增語系
- `POST /api/languages/:lang/translate` - 自動翻譯
- `DELETE /api/languages/:lang` - 刪除語系
- `POST /api/export` - 匯出翻譯包

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License 