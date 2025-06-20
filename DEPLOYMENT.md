# 多語系翻譯管理系統 - 部署指南

## 系統概述
這是一個基於 Node.js + Express + React 的多語系翻譯管理系統，提供 Web 介面讓使用者管理翻譯文件。

## 系統需求
- Node.js 18+ 
- npm 或 yarn
- 至少 512MB RAM
- 至少 1GB 磁碟空間

## 部署步驟

### 1. 上傳檔案
將整個專案資料夾上傳到伺服器

### 2. 安裝依賴
```bash
cd web-app
npm install
cd client
npm install
```

### 3. 建置前端
```bash
cd web-app/client
npm run build
```

### 4. 設定環境變數（可選）
```bash
# 設定埠號（預設 3001）
export PORT=3001

# 設定翻譯檔案目錄（預設 ./translations）
export TRANSLATIONS_DIR=./translations
```

### 5. 啟動服務
```bash
cd web-app
node server.js
```

### 6. 使用 PM2 管理程序（推薦）
```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
cd web-app
pm2 start server.js --name "translation-manager"

# 設定開機自啟
pm2 startup
pm2 save
```

## 目錄結構
```
novaMultilingual/
├── translations/          # 翻譯檔案目錄
│   ├── en/               # 基準語系（英文）
│   ├── zh-TW/            # 繁體中文
│   └── ...
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
- `GET /api/download-export` - 下載匯出檔案

## 支援語系
- 繁體中文 (台灣)
- 簡體中文 (中國)
- 西班牙語、法語、德語
- 日語、韓語、葡萄牙語
- 俄語、義大利語、阿拉伯語
- 印地語、土耳其語、波蘭語
- 越南語、泰語、荷蘭語
- 瑞典語、丹麥語、芬蘭語

## 注意事項
1. 確保 `translations` 目錄有寫入權限
2. 基準語系 `en` 不可刪除
3. 自動翻譯功能需要網路連線
4. 建議使用 HTTPS 部署生產環境

## 故障排除
- 如果埠號被占用，修改 `PORT` 環境變數
- 如果翻譯檔案無法讀取，檢查目錄權限
- 如果自動翻譯失敗，檢查網路連線

## 版本資訊
- 版本：1.0.0
- 更新日期：2024年
- 支援 Node.js：18+ 