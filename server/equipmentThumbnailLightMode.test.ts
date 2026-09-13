import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const browseSource = readFileSync(new URL("../client/src/pages/EquipmentBrowse.tsx", import.meta.url), "utf8");
const manageSource = readFileSync(new URL("../client/src/pages/EquipmentManage.tsx", import.meta.url), "utf8");
const borrowRequestsSource = readFileSync(new URL("../client/src/pages/BorrowRequests.tsx", import.meta.url), "utf8");
const borrowRecordsSource = readFileSync(new URL("../client/src/pages/BorrowRecords.tsx", import.meta.url), "utf8");

describe("器材管理縮圖的淺色模式可讀性", () => {
  it("為圖片容器、圖片本體與預設圖示提供專屬的淺色高對比規則", () => {
    expect(styles).toContain("html:not(.dark) .equipment-management-page .equipment-thumbnail-frame");
    expect(styles).toContain("html:not(.dark) .equipment-management-page .equipment-thumbnail {");
    expect(styles).toContain("html:not(.dark) .equipment-management-page .equipment-thumbnail--placeholder");
    expect(styles).toContain("box-shadow: 0 0 0 2px oklch(1 0 0 / 0.88)");
  });

  it("移除器材操作欄方形按鈕，並為分類使用量與分類操作提供淺色模式對比規則", () => {
    expect(styles).toContain(".equipment-action-button {");
    expect(styles).toContain("border-radius: 9999px;");
    expect(styles).toContain("html:not(.dark) .equipment-management-dialog .category-usage-count--used");
    expect(styles).toContain("html:not(.dark) .equipment-management-dialog .category-management-action--edit");
  });

  it("為無器材資料的器材欄提供專屬淺色背景與對比規則", () => {
    expect(styles).toContain("html:not(.dark) .equipment-management-page .equipment-empty-state");
    expect(styles).toContain(".equipment-empty-state {");
    expect(styles).toContain("html:not(.dark) .equipment-management-page .equipment-empty-state .label-caps");
  });

  it("提升借用申請審核借用期間的起迄日期在淺色模式下的對比", () => {
    expect(borrowRequestsSource).toContain("borrow-request-period-date");
    expect(borrowRequestsSource).toContain("borrow-request-period-end");
    expect(styles).toContain("html:not(.dark) .borrow-requests-page .borrow-request-period-date");
    expect(styles).toContain("border: 1px solid oklch(0.47 0.105 215 / 0.78);");
    expect(styles).toContain("color: oklch(0.25 0.075 225) !important;");
    expect(styles).toContain("html:not(.dark) .borrow-requests-page .borrow-request-period-end");
    expect(styles).toContain("html:not(.dark) .borrow-requests-page .founder-update-notice");
    expect(styles).toContain("color: oklch(0.25 0.065 225) !important;");
    expect(styles).toContain("html:not(.dark) .founder-borrow-update-dialog .founder-update-notice");
    expect(styles).toContain("font-size: 0.875rem;");
    expect(borrowRequestsSource).toContain("borrow-request-review-note");
    expect(styles).toContain("html:not(.dark) .borrow-requests-page .borrow-request-review-note");
    expect(borrowRequestsSource).toContain("borrow-request-content-trigger");
    expect(borrowRequestsSource).toContain("borrow-request-content-dialog");
    expect(styles).toContain("html:not(.dark) .borrow-request-content-dialog {");
  });

  it("為借用記錄空白狀態與伺服器管理員修改申請彈窗提供淺色模式高對比規則", () => {
    expect(borrowRecordsSource).toContain("borrow-records-page");
    expect(borrowRecordsSource).toContain("borrow-records-empty-state");
    expect(borrowRecordsSource).toContain("borrow-record-return-note");
    expect(borrowRecordsSource).toContain("RETURN_NOTE_PREVIEW_LENGTH");
    expect(borrowRecordsSource).toContain("查看「${rec.equipmentName ?? \"器材\"}」的完整備註");
    expect(styles).toContain("html:not(.dark) .borrow-records-page .borrow-records-empty-state");
    expect(styles).toContain("html:not(.dark) .borrow-records-page .borrow-records-empty-state .text-white");
    expect(styles).toContain("html:not(.dark) .borrow-records-page .borrow-record-return-note");
    expect(styles).toContain(".borrow-record-return-note--preview { display: block; max-width: 12rem; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }");
    expect(styles).toContain("html:not(.dark) .borrow-record-note-dialog {");
    expect(borrowRequestsSource).toContain("founder-borrow-update-dialog");
    expect(styles).toContain("html:not(.dark) .founder-borrow-update-dialog {");
    expect(styles).toContain("html:not(.dark) .founder-borrow-update-dialog .industrial-input");
    expect(styles).toContain("html:not(.dark) .founder-borrow-update-dialog .btn-secondary");
  });

  it("為編輯器材提供不滿版且可捲動的矩形彈窗尺寸規則", () => {
    expect(styles).toContain(".equipment-edit-dialog {");
    expect(styles).toContain("width: min(42rem, calc(100vw - 3rem)) !important;");
    expect(styles).toContain("max-height: min(46rem, calc(100dvh - 4rem)) !important;");
    expect(styles).toContain("overflow-y: hidden !important;");
    expect(styles).toContain(".equipment-edit-dialog .equipment-form-scroll-region {");
    expect(styles).toContain("overflow-y: auto;");
    expect(styles).toContain("overscroll-behavior-y: contain;");
    expect(styles).toContain("width: calc(100vw - 2rem) !important;");
  });

  it("將編輯器材的捲動軸收納在彈窗框線內側，並提供深淺主題對比", () => {
    expect(styles).toContain("margin-right: -0.8rem;");
    expect(styles).toContain("padding-right: 1rem;");
    expect(styles).toContain(".equipment-form-scroll-region::-webkit-scrollbar-track");
    expect(styles).toContain("html:not(.dark) .equipment-edit-dialog .equipment-form-scroll-region");
  });

  it("為位置異動紀錄提供與編輯器材一致的右側框內捲動容器", () => {
    expect(styles).toContain(".equipment-location-history-dialog {");
    expect(styles).toContain(".equipment-location-history-dialog .equipment-location-history-content {");
    expect(styles).toContain("overflow-y: hidden !important;");
    expect(styles).toContain("margin-right: -0.8rem;");
    expect(styles).toContain("padding-right: 1rem;");
    expect(styles).toContain("overscroll-behavior-y: contain;");
    expect(styles).toContain("scrollbar-gutter: stable;");
  });

  it("為器材存放位置與操作欄提供深色模式高對比規則", () => {
    expect(styles).toContain(".equipment-location-cell {");
    expect(styles).toContain(".equipment-action-group {");
    expect(styles).toContain(".equipment-action-button--primary { color: oklch(0.79 0.12 210); }");
    expect(styles).toContain(".equipment-action-button--destructive { color: oklch(0.78 0.15 25); }");
  });

  it("降低深色模式選取提示框強度，並提升分類建立時間可讀性", () => {
    expect(styles).toContain(".equipment-selection-summary {");
    expect(styles).toContain("border: 1px solid oklch(0.38 0.065 210 / 0.56);");
    expect(styles).toContain(".category-created-at {");
    expect(styles).toContain("color: oklch(0.76 0.045 210);");
  });

  it("為位置異動與器材刪除確認彈窗提供專屬淺色模式對比規則", () => {
    expect(styles).toContain(".equipment-location-history-dialog .equipment-location-history-filter");
    expect(styles).toContain(".equipment-location-history-dialog .equipment-location-history-entry");
    expect(styles).toContain(".equipment-delete-dialog [role=\"alert\"]");
    expect(styles).toContain(".equipment-delete-dialog .bg-amber-500\\/10");
  });

  it("為位置異動時間軸左側節點圖標提供獨立的淺色模式對比規則", () => {
    expect(styles).toContain(".location-history-timeline-marker {");
    expect(styles).toContain("border-color: oklch(0.34 0.13 210) !important;");
    expect(styles).toContain(".location-history-timeline-marker svg");
  });

  it("提升位置異動篩選日期、批次覆核選取列與待覆核狀態的淺色模式對比", () => {
    expect(styles).toContain(".location-history-filter-label {");
    expect(styles).toContain(".location-history-date-input {");
    expect(styles).toContain(".location-history-review-selection {");
    expect(styles).toContain(".location-history-review-status--pending {");
    expect(styles).toContain("color: oklch(0.34 0.10 70) !important;");
  });

  it("讓位置異動批次覆核勾選欄在淺色模式保有清楚邊框、勾選與鍵盤焦點", () => {
    expect(styles).toContain(".location-history-review-checkbox {");
    expect(styles).toContain("appearance: none;");
    expect(styles).toContain("border: 2px solid oklch(0.38 0.115 215);");
    expect(styles).toContain(".location-history-review-checkbox:checked {");
    expect(styles).toContain(".location-history-review-checkbox:focus-visible {");
  });

  it("為分類刪除確認彈窗提供獨立的淺色模式警示與相依資料對比規則", () => {
    expect(styles).toContain(".equipment-category-delete-dialog [role=\"alert\"]");
    expect(styles).toContain(".equipment-category-delete-dialog .bg-amber-500\\/10");
    expect(styles).toContain(".equipment-category-delete-dialog .max-h-40");
  });

  it("為器材瀏覽圖片與借用申請器材預覽提供獨立的淺色模式對比規則", () => {
    expect(browseSource).toContain("equipment-browse-image");
    expect(browseSource).toContain("borrow-equipment-preview");
    expect(styles).toContain("html:not(.dark) .equipment-browse-image {");
    expect(styles).toContain("html:not(.dark) .borrow-equipment-preview {");
    expect(styles).toContain("html:not(.dark) .borrow-equipment-preview .text-white");
  });

  it("為器材瀏覽無資料狀態提供背景、文字與圖示的淺色模式對比", () => {
    expect(browseSource).toContain("equipment-browse-empty-state");
    expect(styles).toContain("html:not(.dark) .equipment-browse-empty-state {");
    expect(styles).toContain(".equipment-browse-empty-state .text-white");
    expect(styles).toContain(".equipment-browse-empty-state .label-caps");
    expect(styles).toContain(".equipment-browse-empty-state svg");
  });

  it("重整器材分類管理彈窗的標題、工具列、空狀態與分類清單版面", () => {
    expect(manageSource).toContain("equipment-category-manager-dialog");
    expect(manageSource).toContain("category-management-header-note");
    expect(manageSource).toContain("category-management-toolbar");
    expect(manageSource).toContain("category-management-empty-state");
    expect(manageSource).toContain("category-management-table-shell");
    expect(styles).toContain(".equipment-category-manager-dialog .category-management-toolbar");
    expect(styles).toContain("html:not(.dark) .equipment-category-manager-dialog .category-management-table-shell");
  });

  it("提升覆核通過、覆核退回、電子簽核與簽核操作列的淺色模式對比", () => {
    expect(manageSource).toContain("location-history-review-status--approved");
    expect(manageSource).toContain("location-history-review-status--rejected");
    expect(manageSource).toContain("location-history-signature-status--signed");
    expect(manageSource).toContain("location-history-action-row");
    expect(styles).toContain("html:not(.dark) .equipment-location-history-dialog .location-history-review-status--approved");
    expect(styles).toContain("html:not(.dark) .equipment-location-history-dialog .location-history-review-status--rejected");
    expect(styles).toContain("html:not(.dark) .equipment-location-history-dialog .location-history-signature-status--signed");
    expect(styles).toContain("html:not(.dark) .equipment-location-history-dialog .location-history-action-row .btn-secondary");
  });

  it("提升批次覆核提示框內標題與說明文字的淺色模式對比", () => {
    expect(manageSource).toContain("location-history-batch-review-summary");
    expect(styles).toContain("html:not(.dark) .equipment-management-dialog .location-history-batch-review-summary {");
    expect(styles).toContain(".location-history-batch-review-summary .text-sky-100");
    expect(styles).toContain(".location-history-batch-review-summary .text-sky-200");
  });

  it("為單筆覆核與電子簽核確認彈窗提供淺色模式的內容與操作對比", () => {
    expect(manageSource).toContain("location-history-review-dialog");
    expect(manageSource).toContain("location-history-signature-dialog");
    expect(styles).toContain("html:not(.dark) .location-history-review-dialog .btn-primary");
    expect(styles).toContain("html:not(.dark) .location-history-signature-dialog .btn-primary");
    expect(styles).toContain("html:not(.dark) .location-history-review-dialog .space-y-4 > p:first-child");
    expect(styles).toContain("html:not(.dark) .location-history-signature-dialog .space-y-4 > div:first-child");
  });

  it("電子簽核確認彈窗不再顯示簽核後鎖定覆核內容的說明", () => {
    expect(manageSource).not.toContain("簽核後，覆核結果、簽核人員與簽核時間將寫入異動稽核紀錄並鎖定覆核內容");
  });

  it("器材表單的必填提醒僅保留精簡警告文字", () => {
    expect(manageSource).toContain("請先填寫所有標示 * 的必填欄位");
    expect(manageSource).not.toContain("未填寫欄位已以紅框標示");
  });

  it("必填欄位錯誤時統一使用 aria-invalid 紅框，且淺色模式保有可讀性", () => {
    expect(styles).toContain('.industrial-input[aria-invalid="true"] {');
    expect(styles).toContain('border-color: oklch(0.68 0.18 25) !important;');
    expect(styles).toContain('.industrial-input[aria-invalid="true"]:focus {');
    expect(styles).toContain(".form-field-error {");
    expect(styles).toContain('html:not(.dark) .session-main .industrial-input[aria-invalid="true"] {');
    expect(styles).toContain("html:not(.dark) .session-main .form-field-error");
  });

});
