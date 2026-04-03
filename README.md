# 💰 比價達人 (Price Tracker PWA)

這是一個專為購物比價設計的 **Progressive Web App (PWA)**。採用極簡、類似 iOS 原生風格的介面設計，讓您可以輕鬆記錄、比較並分析各個通路的商品價格。

## ✨ 核心特色功能

- **🍎 iOS 風格介面**: 採用玻璃擬物化 (Glassmorphism)、平滑過場動畫及現代化字體，提供頂級的使用者體驗。
- **📱 離線與全螢幕體驗**: 透過 PWA 技術，可將本應用「加入主畫面」，獲得如同原生 App 般的全螢幕享受與基本離線存取功能。
- **🔍 智能商品搜尋**: 支援首頁即時搜尋過濾，快速找到您追蹤的商品。
- **📊 專業價格分析**:
  - 自動計算並換算單位價格。
  - 計算價格百分位數 (Percentile ranking)，告訴您現在的價格「便宜過百分之幾的歷史紀錄」。
  - 智慧購買建議。
- **🗂️ 完整的資料管理**:
  - 新增、編輯及刪除商品與價格紀錄。
  - 支援「歷史歸檔」功能，並具備永久刪除與「批次清空」歸檔庫的設計。
  - **資料備份**: 支援匯出/匯入 JSON 檔案，讓您在換機或清除瀏覽器資料時不會遺失歷史紀錄。
- **📈 價格趨勢圖表**: 採用 Chart.js 動態繪製歷史價格走勢，支援顯示歷史平均與歷史最低價參考線。

## 🛠️ 技術堆疊 (Tech Stack)

本專案採用純前端技術開發，不依賴龐大的框架，保證輕量且快速：

- **核心結構**: HTML5, Vanilla JavaScript
- **視覺樣式**: Vanilla CSS (自訂設計系統、現代 CSS 變數、Flexbox/Grid 佈局)
- **PWA 功能**:
  - `manifest.json` 配置應用程式圖示與全螢幕行為
  - `sw.js` (Service Worker) 處理快取層
- **資料儲存**: IndexedDB API (資料完全離線儲存在您的設備上，支援大規模資料並保護隱私)
- **圖表繪製**: Chart.js (透過 CDN 載入，離線狀態具備優雅退化處理)
- **版本**: v1.1.2

## 🚀 如何快速啟動與安裝？

### 開發與本地測試

如果您需要在本地端修改或測試程式碼：

1. 克隆此專案：
   ```bash
   git clone https://github.com/yuhsin1230/price-tracker.git
   cd price-tracker
   ```
2. 啟動一個本地伺服器 (Local Server)。例如使用 Node.js 的 `http-server`、Python 的 HTTP 模組，或直接使用 VS Code 的 `Live Server` 套件。
3. 如果使用 `npx` (需安裝 Node.js)：
   ```bash
   npx http-server -p 3000
   ```
4. 在瀏覽器中打開 `http://localhost:3000`

### 📱 安裝到 iOS 裝置上 (加入主畫面)

要將應用程式安裝到您的 iPhone 獲得原生體驗：

1. 確認此專案已部署到有 HTTPS 加密的公開網址，或在此區域網路開啟本地伺服器並使用 IP 位址造訪。
2. 開啟 iPhone 上的 **Safari** 瀏覽器並導覽至該網址。
3. 點擊瀏覽器底部的 **「分享」** 按鈕（包含向上箭頭的方塊圖示）。
4. 向下滑動並選擇 **「加入主畫面」 (Add to Home Screen)**。
5. 點擊右上角的 **「新增」**。
6. 回到主畫面，點擊「比價達人」圖示即可開始使用！

## 🌐 線上部署建議

您可以輕鬆地將此專案部署到以下免費的靜態網頁託管服務，讓您隨時隨地都能使用：

- **Vercel** 
- **GitHub Pages** (目前建議使用)
- **Netlify**

*(只需將程式碼推送至 GitHub 倉庫，並在設定中開啟對應的儲存庫 Pages 功能即可)*

## 🤝 貢獻指南

如果您有任何建議或發現了錯誤，非常歡迎開一個 Issue 或是提交 Pull Request (PR)。
建議的操作流程：
1. Fork 此專案
2. 建立一個全新的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送至遠端分支 (`git push origin feature/AmazingFeature`)
5. 發起 Pull Request

## 📄 授權條款

此專案目前作為個人開發與展示用途。
