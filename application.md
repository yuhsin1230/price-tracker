# APP SPEC: 價格追蹤與比價系統

## 1. 產品目標
此應用程式用於記錄商品在不同賣場的價格，並透過歷史資料分析，幫助使用者判斷目前價格是否為低點，以及找出最低購買價格。

核心價值：
- 判斷「現在是否值得購買」
- 跨賣場價格比較
- 跨規格價格比較（大容量 vs 小容量哪個划算）
- 長期價格追蹤

---

## 2. 核心資料模型

### 2.1 Product（商品）
欄位：
- id (UUID)
- name (String, 必填)
- brand (String, optional)
- barcode (String, optional)
- category (String, optional)
- unitType (String, 必填，例如 ml, g, count)
- isArchived (Boolean, default: false)
- createdAt (Date)
- updatedAt (Date)

規則：
- 商品需具唯一性（避免重複）
- name + brand + unitType 可作為去重依據
- Product 不綁定特定容量，容量記錄在 PriceRecord 中
- 刪除時標記 isArchived = true（Soft Delete），歷史資料保留

---

### 2.2 Store（賣場）
欄位：
- id (UUID)
- name (String, 必填)
- location (String, optional)
- note (String, optional)
- isArchived (Boolean, default: false)
- createdAt (Date)
- updatedAt (Date)

規則：
- 刪除時標記 isArchived = true（Soft Delete），歷史資料保留
- 已封存的賣場不出現在新增紀錄的選單中

---

### 2.3 PriceRecord（價格紀錄）
欄位：
- id (UUID)
- productId (UUID, FK → Product)
- storeId (UUID, FK → Store)
- price (Decimal, 必填)
- quantity (Int, 必填, default: 1)
- unitSize (Decimal, 必填，例如 600)
- totalSize (Decimal, 計算欄位 = quantity * unitSize)
- unitPrice (Decimal, 計算欄位 = price / totalSize)
- isPromotion (Boolean, default: false)
- date (Date, 必填)
- note (String, optional)
- createdAt (Date)

規則：
- unitPrice 必須統一計算
- 所有比較基於 unitPrice
- 同一商品可記錄不同 unitSize（例如 350ml、600ml、1250ml），皆透過 unitPrice 統一比較

---

## 3. 核心功能模組

### 3.1 商品管理
功能：
- 建立商品
- 編輯商品
- 刪除商品（Soft Delete，標記為封存）
- 還原已封存商品
- 商品列表顯示

補充：
- 建立商品時需檢查是否重複（name + brand + unitType）
- 刪除商品僅標記封存，歷史價格紀錄完整保留
- 封存商品不出現在新增紀錄的選單中，但可在設定中查看與還原

---

### 3.2 賣場管理
功能：
- 建立賣場
- 編輯賣場
- 刪除賣場（Soft Delete，標記為封存）
- 還原已封存賣場
- 賣場列表

補充：
- 刪除賣場僅標記封存，歷史資料完整保留

---

### 3.3 價格紀錄管理
功能：
- 新增價格紀錄
- 編輯價格紀錄
- 刪除價格紀錄
- 查詢某商品的所有價格紀錄

輸入內容：
- 商品
- 賣場
- 價格
- 數量（預設 1）
- 單件規格（容量/重量）
- 日期
- 是否為促銷價
- 備註

系統行為：
- 自動計算 totalSize
- 自動計算 unitPrice
- 自動帶入上次相同商品的規格作為預設值

---

## 4. 價格分析邏輯

### 4.1 單一商品分析（全規格）
輸出：
- minUnitPrice（歷史最低單位價格）+ 對應賣場、日期、規格
- maxUnitPrice（歷史最高）
- avgUnitPrice（歷史平均）
- latestUnitPrice（最新一筆）
- percentile（目前價格在歷史價格中的百分位排名）
- recommendation（購買建議等級）

百分位排名說明：
- percentile = 15% 表示目前價格比 85% 的歷史紀錄都便宜

購買建議等級：
- 🟢 強烈建議購買（percentile < 20%，歷史低價區）
- 🟡 可以考慮購買（percentile 20%~40%，低於平均）
- ⚪ 觀望（percentile 40%~60%，接近平均）
- 🟠 建議等待（percentile 60%~80%，高於平均）
- 🔴 不建議購買（percentile > 80%，歷史高價區）

最低價判斷邏輯：
- 使用容差比較（差值 < 0.01）避免浮點精度問題
- 分析範圍為完整歷史紀錄（不限時間），配合長週期購買模式

---

### 4.2 單一商品分析（各規格分組）
輸出：
- 依 unitSize 分組
- 每個規格的 min / max / avg unitPrice
- 比較哪種規格長期來看最划算

用途：
- 判斷買大容量還是小容量比較划算

---

### 4.3 跨賣場比較
輸出：
- 每個賣場的最新 unitPrice
- 每個賣場的歷史最低 unitPrice
- 每個賣場的平均 unitPrice
- 每個賣場的紀錄數量（資料可靠度參考）
- 依最新 unitPrice 排序

---

### 4.4 全商品最低價總覽
輸出：
對每個商品（未封存）：
- 商品名稱
- 歷史最低 unitPrice + 對應賣場、日期、規格
- 最近紀錄的 unitPrice
- 購買建議等級

用途：
- 提供快速比價總覽
- 首頁「現在值得買」與「再等等」的分組依據

---

### 4.5 價格趨勢（可選）
- 依時間排序價格紀錄
- 用於繪製折線圖

---

## 5. 搜尋與篩選

功能：
- 商品名稱搜尋（模糊搜尋）
- 依分類篩選
- 依賣場篩選
- 依購買建議等級篩選
- 排序：
  - unitPrice（升冪）
  - 更新時間
  - 降價幅度

---

## 6. 使用流程（UX Flow）

### 新增價格流程：
1. 選擇或搜尋商品
2. 選擇賣場（預設帶入上次使用的賣場）
3. 輸入價格、數量（預設 1）、規格（預設帶入上次同商品的規格）
4. 儲存

要求：
- 步驟最少化
- 支援快速選擇最近記錄過的商品
- 常用商品置頂
- 自動帶入合理預設值以減少輸入

### 首頁設計：
- 以「🟢 現在值得買」和「🟠 再等等」分組顯示追蹤中的商品
- 每個商品顯示：名稱、目前單位價格、對應賣場、購買建議等級
- 底部提供「記錄新價格」的快速入口

---

## 7. 資料處理規則

### 7.1 單位價格統一
- 所有比較必須使用 unitPrice
- 禁止直接使用 price 比較

---

### 7.2 多件優惠處理
- quantity 必須納入計算
- totalSize = quantity * unitSize

---

### 7.3 跨規格比較
- 同一商品不同 unitSize 的紀錄皆透過 unitPrice 統一比較
- unitPrice = price / (quantity * unitSize)

---

### 7.4 金額精度
- 所有價格相關欄位使用 Decimal 型別
- 避免浮點數精度問題

---

### 7.5 資料完整性
- 不允許缺少 unitSize
- 不允許 unitPrice 為 null

---

## 8. 非功能需求

- 支援離線使用（本地資料庫）
- 操作需快速（新增紀錄 < 3 秒）
- UI 簡單（減少輸入成本）

---

## 9. MVP 範圍（第一版）

必須實作：
- 商品管理（含 Soft Delete）
- 賣場管理（含 Soft Delete）
- 價格紀錄（支援不同規格記錄）
- unitPrice 計算
- 單一商品分析（含百分位排名、購買建議等級）
- 跨規格比較
- 全商品最低價總覽
- 首頁「值得買 / 再等等」分組顯示

不包含：
- 通知
- 圖表
- 雲端同步
- 條碼掃描

---

## 10. 關鍵設計原則（必須遵守）

1. 所有價格比較基於 unitPrice
2. 商品資料不可重複
3. 歷史資料不可刪除（僅允許 Soft Delete）
4. 輸入流程必須極簡
5. 分析結果需明確（購買建議等級 + 百分位排名）
6. 支援同商品不同規格的比較
7. 金額計算使用 Decimal 型別確保精度