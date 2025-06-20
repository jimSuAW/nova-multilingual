# 翻譯管理系統 Web 介面

這是一個基於 Web 的多語系翻譯管理系統，提供直觀的圖形化介面來管理翻譯文件。

## 功能特色

- 🌍 **多語系管理**：支援多種語系的翻譯管理
- 🚀 **一鍵新增語系**：自動創建語系並進行初步翻譯
- 📊 **翻譯進度追蹤**：即時顯示各語系的翻譯完成度
- ✏️ **視覺化編輯器**：直觀的翻譯內容編輯介面
- 📦 **翻譯包匯出**：一鍵匯出完整的翻譯文件包
- 🔄 **自動翻譯**：整合自動翻譯功能，快速生成初版翻譯

## 安裝與運行

### 前置需求

- Node.js 16.0 或以上版本
- npm 或 yarn

### 安裝步驟

1. **安裝後端依賴**
   ```bash
   cd web-app
   npm install
   ```

2. **安裝前端依賴**
   ```bash
   cd client
   npm install
   ```

3. **啟動開發伺服器**
   ```bash
   # 在 web-app 目錄下
   npm run dev
   ```

4. **啟動前端開發伺服器**
   ```bash
   # 在 web-app/client 目錄下
   npm start
   ```

### 生產環境部署

1. **建置前端**
   ```bash
   cd client
   npm run build
   ```

2. **啟動生產伺服器**
   ```bash
   # 在 web-app 目錄下
   npm start
   ```

## 使用方式

### 1. 儀表板
- 查看所有語系的概覽
- 顯示翻譯統計資訊
- 快速新增語系
- 匯出翻譯包

### 2. 語系管理
- 查看各語系的翻譯文件
- 管理語系（新增、刪除）
- 查看翻譯進度

### 3. 翻譯編輯器
- 編輯翻譯內容
- 即時保存
- 重置更改

## API 端點

### 語系管理
- `GET /api/languages` - 獲取所有語系
- `POST /api/languages` - 創建新語系
- `DELETE /api/languages/:language` - 刪除語系

### 文件管理
- `GET /api/languages/:language/files` - 獲取語系文件列表
- `GET /api/languages/:language/files/:filename` - 獲取文件內容
- `PUT /api/languages/:language/files/:filename` - 更新文件內容

### 統計資訊
- `GET /api/languages/:language/stats` - 獲取語系統計

### 匯出功能
- `POST /api/export` - 匯出翻譯包

## 技術架構

### 後端
- **Express.js** - Web 框架
- **fs-extra** - 文件系統操作
- **CORS** - 跨域支援

### 前端
- **React** - 前端框架
- **React Router** - 路由管理
- **Axios** - HTTP 客戶端
- **React Hot Toast** - 通知系統
- **Lucide React** - 圖標庫

## 目錄結構

```
web-app/
├── server.js              # Express 伺服器
├── package.json           # 後端依賴
├── client/                # React 前端
│   ├── public/
│   │   ├── components/    # React 組件
│   │   ├── App.js         # 主應用程式
│   │   └── index.js       # 入口點
│   └── package.json       # 前端依賴
└── README.md              # 說明文件
```

## 環境變數

- `PORT` - 伺服器端口（預設：3001）
- `NODE_ENV` - 環境模式（development/production）

## 部署選項

### 本地部署
適合開發和測試環境

### Heroku 部署
1. 創建 Heroku 應用程式
2. 設置環境變數
3. 部署代碼

### Docker 部署
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 故障排除

### 常見問題

1. **端口被佔用**
   - 修改 `PORT` 環境變數
   - 或終止佔用端口的程序

2. **前端無法連接後端**
   - 確認後端伺服器正在運行
   - 檢查 CORS 設定
   - 確認 API 基礎 URL 設定

3. **翻譯文件無法載入**
   - 確認 `translations` 目錄存在
   - 檢查文件權限
   - 確認 JSON 格式正確

## 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個專案。

## 授權

MIT License 