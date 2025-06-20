# 多語系翻譯管理工具使用指南

## 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 建立新的語系
```bash
# 建立繁體中文語系
npm run translation:create zh-TW

# 建立簡體中文語系
npm run translation:create zh-CN

# 建立日文語系
npm run translation:create ja

# 建立韓文語系
npm run translation:create ko
```

### 3. 檢查翻譯完整性
```bash
# 檢查特定語系
npm run translation:check zh-TW

# 檢查所有語系
npm run translation:check-all
```

### 4. 驗證翻譯品質
```bash
# 驗證所有語系
node scripts/translation-validator.js validate

# 驗證特定語系
node scripts/translation-validator.js validate zh-TW
```

## 詳細功能說明

### 翻譯管理工具 (translation-manager.js)

#### 建立新語系
```bash
node scripts/translation-manager.js create <語系代碼>
```

**功能：**
- 自動建立語系資料夾
- 複製基準語系檔案結構
- 建立翻譯模板（所有值設為空字串）

**範例：**
```bash
node scripts/translation-manager.js create zh-TW
```

#### 檢查翻譯完整性
```bash
node scripts/translation-manager.js check <語系代碼>
```

**功能：**
- 檢查缺少的鍵值
- 檢查空值
- 計算翻譯完成度

**範例：**
```bash
node scripts/translation-manager.js check zh-TW
```

#### 列出所有語系
```bash
node scripts/translation-manager.js list
```

### 翻譯驗證工具 (translation-validator.js)

#### 驗證翻譯品質
```bash
node scripts/translation-validator.js validate [語系代碼]
```

**檢查項目：**
- JSON 格式正確性
- 結構一致性
- 空值檢查
- 未翻譯內容檢查
- 變數插值一致性
- 翻譯長度合理性

**範例：**
```bash
# 驗證所有語系
node scripts/translation-validator.js validate

# 驗證特定語系
node scripts/translation-validator.js validate zh-TW
```

## 資料夾結構

```
translations/
├── en/                    # 英文 (基準語系)
│   ├── account.json
│   ├── product.json
│   ├── common.json
│   └── ...
├── zh-TW/                 # 繁體中文
│   ├── account.json
│   ├── product.json
│   ├── common.json
│   └── ...
└── translation-report.json # 驗證報告
```

## 翻譯檔案格式

### 基本格式
```json
{
  "key": "value",
  "nested": {
    "key": "value"
  }
}
```

### 變數插值
```json
{
  "welcome": "Welcome, {name}!",
  "productCount": "Showing {count} out of {total} products"
}
```

### 複數形式
```json
{
  "item": "item",
  "item_plural": "items",
  "product": "product",
  "product_plural": "products"
}
```

## 最佳實踐

### 1. 鍵值命名
- 使用小寫字母和底線
- 使用描述性名稱
- 保持一致性

**好的範例：**
```json
{
  "add_to_cart": "Add to cart",
  "product_description": "Product description"
}
```

**不好的範例：**
```json
{
  "addToCart": "Add to cart",
  "productDescription": "Product description"
}
```

### 2. 變數使用
- 使用大括號 `{}` 包圍變數
- 使用描述性變數名稱
- 保持變數名稱一致性

**好的範例：**
```json
{
  "welcome_user": "Welcome, {userName}!",
  "product_price": "Price: {price}"
}
```

### 3. 翻譯品質
- 避免直接複製英文
- 保持文化適應性
- 注意長度限制
- 檢查語法正確性

## 常見問題

### Q: 如何新增新的翻譯檔案？
A: 先在基準語系 (en) 中新增檔案，然後執行 `npm run translation:create <語系代碼>` 來同步到其他語系。

### Q: 如何檢查翻譯進度？
A: 使用 `npm run translation:check <語系代碼>` 來查看翻譯完成度。

### Q: 如何確保翻譯品質？
A: 使用 `node scripts/translation-validator.js validate` 來進行全面檢查。

### Q: 如何處理變數插值？
A: 確保所有語系都包含相同的變數，使用 `{變數名}` 格式。

## 進階功能

### 自動化腳本
```bash
# 一次性設定所有常用語系
npm run translation:setup

# 檢查所有語系
npm run translation:check-all
```

### 自訂配置
您可以修改 `translation-manager.js` 和 `translation-validator.js` 中的配置來適應您的需求：

- 基準語系設定
- 資料夾路徑
- 驗證規則
- 報告格式

## 整合建議

### 與 CI/CD 整合
```yaml
# GitHub Actions 範例
- name: Check translations
  run: |
    npm run translation:check-all
    node scripts/translation-validator.js validate
```

### 與編輯器整合
- 使用 VS Code 的 i18n 擴充功能
- 設定自動格式化
- 啟用 JSON 語法檢查

## 支援

如果您遇到問題或有建議，請：
1. 檢查錯誤訊息
2. 查看驗證報告
3. 確認檔案格式正確性
4. 檢查資料夾結構 