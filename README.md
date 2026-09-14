# 清水高中媒體服務隊管理系統

這是一套可獨立執行的清水高中媒體服務隊管理系統，採用 React、Vite、Express、tRPC、Drizzle ORM 與 MySQL。專案不依賴特定平台的登入、儲存或通知服務，適合放入 GitHub 後使用一般 Node.js 主機、容器或自有伺服器部署。

## 主要功能

系統保留器材管理、器材分類、借用申請、借用與歸還、QR／Barcode 掃描、報帳、系統報告、媒服行事曆、PDF 匯出、稽核紀錄、通行密鑰與多層角色權限。登入使用系統內建帳號密碼流程，使用者角色包含管理員、教師與學生。

QR／Barcode 掃描器使用瀏覽器相機權限與 `html5-qrcode`，不需要第三方掃描後端。PDF 與附件檔案可以使用 S3、Cloudflare R2 或 MinIO 等 S3 相容儲存服務；郵件使用一般 SMTP 設定。

## 技術需求

| 項目 | 建議版本或服務 |
|---|---|
| Node.js | 22 LTS 或更新版本 |
| 套件管理 | pnpm 10 |
| 資料庫 | MySQL 8 或相容服務 |
| 檔案儲存 | AWS S3、Cloudflare R2 或 MinIO |
| 郵件 | 任一支援 SMTP 的服務 |
| 瀏覽器 | 支援 HTTPS 相機權限與 WebAuthn 的現代瀏覽器 |

## 快速開始

先複製本專案並安裝依賴：

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

接著在部署環境設定必要的環境變數。正式環境必須使用至少 32 字元的 `JWT_SECRET`、有效的 `DATABASE_URL`，並以 HTTPS 提供網站，否則相機與通行密鑰功能可能無法使用。

```bash
pnpm db:push
pnpm dev
```

正式啟動使用：

```bash
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

## 環境變數

| 變數 | 必要性 | 用途 |
|---|---|---|
| `DATABASE_URL` | 必要 | MySQL 連線字串 |
| `JWT_SECRET` | 必要 | HTTP-only session JWT 簽章，至少 32 字元 |
| `APP_ID` | 建議 | 系統識別名稱，預設為 `qingshui-media-service` |
| `PUBLIC_APP_URL` | 正式環境必要 | 公開網址與通行密鑰的 relying-party 驗證 |
| `PORT` | 選填 | Express 監聽埠號 |
| `CRON_SECRET` | 使用排程時必要 | 標準排程 endpoint 的 `x-cron-secret` 驗證 |
| `S3_ENDPOINT` | R2／MinIO 必要 | S3 相容 endpoint；AWS S3 可留空 |
| `S3_REGION` | 建議 | S3 region，R2 通常使用 `auto` |
| `S3_BUCKET` | 使用檔案功能必要 | 儲存桶名稱 |
| `S3_ACCESS_KEY_ID` | 使用檔案功能必要 | S3 存取金鑰 |
| `S3_SECRET_ACCESS_KEY` | 使用檔案功能必要 | S3 私密金鑰 |
| `S3_PUBLIC_BASE_URL` | 選填 | 公開檔案網址前綴；未設定時使用受保護 `/storage/*` 代理 |
| `SMTP_HOST` | 使用郵件時必要 | SMTP 主機 |
| `SMTP_PORT` | 使用郵件時必要 | SMTP 埠號，預設 587 |
| `SMTP_USER`／`SMTP_PASS` | 依服務而定 | SMTP 驗證資訊 |
| `SMTP_FROM` | 使用郵件時必要 | 寄件者地址 |
| `NOTIFICATION_EMAIL` | 選填 | 系統警示通知收件者 |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google 整合時必要 | Google Cloud OAuth Web client ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google 整合時必要 | Google Cloud OAuth client secret |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Google 整合時必要 | OAuth callback 網址 |
| `SCHEDULER_API_URL`／`SCHEDULER_API_KEY` | 可選 | 使用外部 scheduler provider 管理背景排程時使用；未設定時排程管理 API 會安全停用 |

請不要把實際密鑰提交至 GitHub。建議使用 GitHub Actions Secrets、主機 Secret Manager 或部署平台的環境變數管理功能。

## Google Calendar 雙向同步

行事曆資料模型已預留 Google event ID、Google 更新時間、同步狀態與同步錯誤欄位。正式啟用時，請在 Google Cloud Console 啟用 Google Calendar API，建立 Web application OAuth client，並將 redirect URI 設為部署環境的 HTTPS callback。同步設計使用一個全隊共用 Google 帳號與共用行事曆；媒服最後修改時間優先，外部事件則以 Google event ID 去重，錯誤寫入同步狀態供管理員處理。

Google OAuth refresh token 必須只儲存在伺服器端受保護的資料庫或 Secret Manager，不能放在瀏覽器、前端 bundle 或 GitHub。若尚未設定 Google 憑證，媒服內建行事曆仍可獨立運作，不會因 Google 整合缺少設定而停止。

## GitHub 使用方式

本專案包不包含任何平台密鑰、`.env`、`node_modules` 或 `dist`。`client/public/sitemap.xml` 與 `robots.txt` 使用 `https://your-domain.example` 佔位網域，部署前請替換成正式網域。建立 repository 後，可使用以下流程：

```bash
git init
git add .
git commit -m "chore: initialize standalone media service"
git branch -M main
git remote add origin https://github.com/<owner>/<repository>.git
git push -u origin main
```

推送前請確認 `git status` 沒有顯示密鑰、資料庫匯出檔、使用者資料或實際上傳附件。部署平台只需執行 `pnpm install`、`pnpm build`，再以 `pnpm start` 啟動 Express 伺服器。

## GitHub Pages 與完整系統部署

GitHub Pages 只能提供靜態前端檔案，不能執行本專案所需的 Express、tRPC、MySQL、HTTP-only session、S3 signed URL 或 SMTP。因此，不能把 repository 的 `main` 根目錄直接設定為 Pages 來源；那樣會顯示 README 或原始碼，而不是建置後的網站。

本 repository 已加入 `.github/workflows/deploy-pages.yml`。它會在前端相關檔案更新時執行 `pnpm build`，只將 `dist/public` 上傳到 GitHub Pages，並自動建立 SPA 的 `404.html` fallback 與自訂網域 `qsshmst.qshs.tw`。若前端要呼叫獨立後端，請在 repository 的 **Settings → Secrets and variables → Actions → Variables** 設定公開變數 `VITE_API_BASE_URL`，例如 `https://api.example.com`。後端必須另外設定 CORS，允許前端網域並支援 credentials；若未設定，前端預設使用同源 `/api/trpc`，適合與 Express 一起部署。

完整可登入、可讀寫資料的部署，請使用支援 Node.js 22、MySQL、S3／R2／MinIO、SMTP 與 HTTPS 的主機或容器服務。正式服務執行方式如下：

```bash
pnpm install --frozen-lockfile
pnpm db:push
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

GitHub Pages 的成功部署只代表靜態前端已發布，不代表完整後端已上線。若只部署 Pages 而沒有設定 `VITE_API_BASE_URL` 與可用的獨立後端，登入、資料查詢、檔案與寄信功能不會正常運作。

## 資料庫與 migration

`drizzle/` 內包含完整 schema 與 migration。Google Calendar 欄位的新增 migration 為 `0067_motionless_namora.sql`，只新增欄位與唯一索引，不會刪除既有行事曆資料。正式環境套用 migration 前，請先備份資料庫並在測試資料庫驗證：

```bash
pnpm drizzle-kit migrate
```

## 安全注意事項

系統登入 session 使用 HTTP-only cookie；正式環境請使用 HTTPS、嚴格設定 `PUBLIC_APP_URL`，並定期輪替 `JWT_SECRET`。S3 儲存預設透過伺服器簽發短期 signed URL，避免把儲存桶設為公開。所有管理操作仍寫入既有稽核紀錄，請限制資料庫帳號權限並為部署環境設定備份與監控。

## 測試與驗證

提交前請執行：

```bash
pnpm check
pnpm test
pnpm build
```

目前獨立化基線已通過 TypeScript 檢查與 production build。完整整合測試需要提供測試用 MySQL、S3 與 SMTP 設定；沒有這些服務時，與資料庫及外部服務相關的測試應在 CI 中以專用測試服務執行。
