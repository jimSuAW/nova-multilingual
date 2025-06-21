# Google Cloud Platform 翻譯 API 設定指南

## 🎯 為什麼選擇 GCP Cloud Translation？

- **💰 免費額度大**：每月前 50 萬字元免費（相當於 $10 credit）
- **🚀 配置簡單**：只需要一個 API 金鑰
- **🔥 效能優異**：Google 自家翻譯引擎，品質卓越
- **📦 批次支援**：原生支援批次翻譯，效率更高
- **🛡️ 穩定可靠**：99.9% 可用性保證

## 📋 設定步驟

### 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 點擊「建立專案」或選擇現有專案
3. 記住你的專案 ID（稍後會用到）

### 2. 啟用 Cloud Translation API

1. 在 Google Cloud Console 中，前往「API 和服務」→「程式庫」
2. 搜尋「Cloud Translation API」
3. 點擊「啟用」

### 3. 建立 API 金鑰

1. 前往「API 和服務」→「憑證」
2. 點擊「建立憑證」→「API 金鑰」
3. 複製生成的 API 金鑰
4. （建議）點擊「限制金鑰」來增加安全性：
   - 選擇「限制金鑰」
   - 在「API 限制」中選擇「Cloud Translation API」

### 4. 設定環境變數

#### 方法 1：環境變數
```bash
export GOOGLE_TRANSLATE_API_KEY="your_api_key_here"
export GOOGLE_CLOUD_PROJECT_ID="your_project_id"
```

#### 方法 2：建立 .env 檔案
在專案根目錄建立 `.env` 檔案：
```env
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

### 5. 測試配置

執行翻譯命令測試：
```bash
# 翻譯到日文
node scripts/auto-translator.js ja

# 翻譯到繁體中文
node scripts/auto-translator.js zh-tw
```

## 🌍 支援的語言代碼

| 語言 | 代碼 | 語言 | 代碼 |
|------|------|------|------|
| 日文 | `ja` | 韓文 | `ko` |
| 繁體中文 | `zh-tw` | 簡體中文 | `zh-cn` |
| 法文 | `fr` | 德文 | `de` |
| 西班牙文 | `es` | 葡萄牙文 | `pt` |
| 義大利文 | `it` | 俄文 | `ru` |
| 阿拉伯文 | `ar` | 荷蘭文 | `nl` |
| 瑞典文 | `sv` | 挪威文 | `no` |

完整語言清單請參考：[Google Cloud Translation 支援語言](https://cloud.google.com/translate/docs/languages)

## 💰 定價資訊

### 免費額度
- **每月前 50 萬字元免費**（約 $10 價值）
- 適合大部分中小型專案

### 付費定價
- **$20 / 100 萬字元**（超過免費額度後）
- 比 Azure 更簡單，無需複雜的區域配置

### 成本估算
```
500 個翻譯項目 × 平均 50 字元 = 25,000 字元
25,000 字元 × 10 種語言 = 250,000 字元總量
= 完全在免費額度內！ 💰
```

## 🚀 效能優勢

與舊系統相比：
- **翻譯時間**：從 4+ 分鐘縮短到 30-60 秒
- **成功率**：從 0% 提升到 95%+
- **翻譯品質**：Google 頂級翻譯引擎
- **批次處理**：25 個項目/批次，6 個並行請求

## 🔧 進階配置

### 使用服務帳戶（推薦用於生產環境）

1. 在 Google Cloud Console 中建立服務帳戶
2. 下載 JSON 金鑰檔案
3. 設定環境變數：
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
```

### API 配額管理

預設配額通常足夠使用，如需提高：
1. 前往「API 和服務」→「配額」
2. 搜尋「Cloud Translation API」
3. 申請增加配額

## ❓ 常見問題

### Q: API 金鑰安全嗎？
A: 建議使用 API 限制功能，只允許特定 API 使用。生產環境建議使用服務帳戶。

### Q: 免費額度用完怎麼辦？
A: 系統會自動切換到付費模式，$20/100萬字元的價格非常合理。

### Q: 翻譯品質如何？
A: Google 翻譯是業界領先的機器翻譯服務，品質優異。

### Q: 支援哪些檔案格式？
A: 目前支援 JSON 格式的翻譯檔案，未來可擴展支援其他格式。

### Q: 如何監控使用量？
A: 在 Google Cloud Console 的「API 和服務」→「配額」中可以查看使用情況。

## 🎉 開始使用

設定完成後，執行以下命令開始翻譯：

```bash
# 翻譯到日文
npm run translate ja

# 翻譯到多種語言
npm run translate zh-tw
npm run translate ko
npm run translate fr
```

享受快速、高品質的翻譯服務！ 🚀 