import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { applySystemPdfWatermark } from "./pdfWatermark";

export type ReimbursementPdfClaim = {
  claimNumber: string;
  title: string;
  purpose: string | null;
  totalAmount: string | number;
  requesterUsername: string | null;
  requesterName: string | null;
  requesterRealName: string | null;
  reviewerUsername: string | null;
  reviewerName: string | null;
  reviewerRealName: string | null;
  reviewedAt: Date | string | null;
  reviewNote: string | null;
  status: string;
  items: Array<{
    expenseDate: Date | string;
    category: string;
    merchant: string | null;
    description: string;
    amount: string | number;
  }>;
  receipts: Array<{
    fileName: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date | string;
  }>;
};

type ReimbursementPrintMode = "pdf" | "print";

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

function getName(realName: string | null, name: string | null, username: string | null, fallback: string): string {
  return realName?.trim() || name?.trim() || username?.trim() || fallback;
}

function isImageReceipt(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addText(parent: HTMLElement, text: string, styles: Partial<CSSStyleDeclaration> = {}) {
  const element = document.createElement("p");
  element.textContent = text;
  Object.assign(element.style, { margin: "0", ...styles });
  parent.append(element);
  return element;
}

function createReimbursementSheet(claim: ReimbursementPdfClaim, exportedBy: string, mode: ReimbursementPrintMode): HTMLElement {
  const sheet = document.createElement("section");
  Object.assign(sheet.style, {
    width: "760px",
    minHeight: "1040px",
    padding: "38px",
    background: "#ffffff",
    color: "#111827",
    fontFamily: "Arial, 'Noto Sans TC', sans-serif",
    boxSizing: "border-box",
  });

  const header = document.createElement("header");
  Object.assign(header.style, { borderBottom: "3px solid #0f172a", paddingBottom: "16px" });
  addText(header, "清水高中媒體服務隊管理系統", { fontSize: "13px", fontWeight: "700", color: "#0f766e", letterSpacing: "0.06em" });
  addText(header, "已核准報帳單", { marginTop: "6px", fontSize: "26px", fontWeight: "700", color: "#0f172a" });
  addText(header, `單號：${claim.claimNumber}`, { marginTop: "7px", fontSize: "13px", color: "#475569", fontFamily: "monospace" });
  sheet.append(header);

  const overview = document.createElement("section");
  Object.assign(overview.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", marginTop: "22px", padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0" });
  const requester = getName(claim.requesterRealName, claim.requesterName, claim.requesterUsername, "未提供");
  const reviewer = getName(claim.reviewerRealName, claim.reviewerName, claim.reviewerUsername, "教師／管理人員");
  [
    ["報帳名稱", claim.title],
    ["申請人", requester],
    ["狀態", claim.status === "paid" ? "已付款" : "已核准"],
    ["核准人", reviewer],
    ["核准時間", formatDate(claim.reviewedAt)],
    ["總金額", formatCurrency(claim.totalAmount)],
  ].forEach(([label, value]) => {
    const detail = document.createElement("div");
    addText(detail, label, { fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.04em" });
    addText(detail, value, { marginTop: "4px", fontSize: "14px", color: "#0f172a", fontWeight: label === "總金額" ? "700" : "400" });
    overview.append(detail);
  });
  sheet.append(overview);

  const purpose = document.createElement("section");
  Object.assign(purpose.style, { marginTop: "20px", borderLeft: "4px solid #0f766e", padding: "10px 14px", background: "#f0fdfa" });
  addText(purpose, "用途說明", { fontSize: "12px", fontWeight: "700", color: "#0f766e" });
  addText(purpose, claim.purpose?.trim() || "未填寫用途說明", { marginTop: "6px", fontSize: "13px", lineHeight: "1.65", whiteSpace: "pre-wrap" });
  sheet.append(purpose);

  const itemHeading = document.createElement("h2");
  itemHeading.textContent = "支出明細";
  Object.assign(itemHeading.style, { margin: "24px 0 10px", fontSize: "17px", color: "#0f172a" });
  sheet.append(itemHeading);
  const table = document.createElement("table");
  Object.assign(table.style, { width: "100%", borderCollapse: "collapse", fontSize: "12px" });
  const headerRow = document.createElement("tr");
  ["日期", "類別", "店家／支出內容", "金額"].forEach((title, index) => {
    const cell = document.createElement("th");
    cell.textContent = title;
    Object.assign(cell.style, { border: "1px solid #cbd5e1", padding: "9px", textAlign: index === 3 ? "right" : "left", background: "#e2e8f0", color: "#334155", fontWeight: "700" });
    headerRow.append(cell);
  });
  const head = document.createElement("thead");
  head.append(headerRow);
  table.append(head);
  const body = document.createElement("tbody");
  claim.items.forEach((item) => {
    const row = document.createElement("tr");
    const description = item.merchant?.trim() ? `${item.merchant}｜${item.description}` : item.description;
    [new Date(item.expenseDate).toLocaleDateString("zh-TW"), item.category, description, formatCurrency(item.amount)].forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      Object.assign(cell.style, { border: "1px solid #cbd5e1", padding: "9px", lineHeight: "1.5", verticalAlign: "top", textAlign: index === 3 ? "right" : "left", fontFamily: index === 3 ? "monospace" : "inherit" });
      row.append(cell);
    });
    body.append(row);
  });
  const totalRow = document.createElement("tr");
  const totalLabel = document.createElement("td");
  totalLabel.colSpan = 3;
  totalLabel.textContent = "總計";
  Object.assign(totalLabel.style, { border: "1px solid #94a3b8", padding: "10px", textAlign: "right", fontWeight: "700", background: "#f8fafc" });
  const totalAmount = document.createElement("td");
  totalAmount.textContent = formatCurrency(claim.totalAmount);
  Object.assign(totalAmount.style, { border: "1px solid #94a3b8", padding: "10px", textAlign: "right", fontWeight: "700", fontFamily: "monospace", background: "#f8fafc" });
  totalRow.append(totalLabel, totalAmount);
  body.append(totalRow);
  table.append(body);
  sheet.append(table);

  const receiptHeading = document.createElement("h2");
  receiptHeading.textContent = "收據附件";
  Object.assign(receiptHeading.style, { margin: "24px 0 10px", fontSize: "17px", color: "#0f172a" });
  sheet.append(receiptHeading);
  if (claim.receipts.length === 0) {
    addText(sheet, "本報帳單未附加收據附件", { padding: "12px 14px", border: "1px dashed #94a3b8", color: "#64748b", fontSize: "13px" });
  } else {
    const receiptList = document.createElement("section");
    Object.assign(receiptList.style, { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" });
    claim.receipts.forEach((receipt, index) => {
      const card = document.createElement("article");
      Object.assign(card.style, { breakInside: "avoid", border: "1px solid #cbd5e1", padding: "12px", background: "#f8fafc" });
      addText(card, `附件 ${index + 1}｜${receipt.fileName}`, { fontSize: "12px", fontWeight: "700", color: "#0f172a", overflowWrap: "anywhere" });
      addText(card, `${receipt.mimeType.toUpperCase()} · ${formatFileSize(receipt.sizeBytes)} · 附加於 ${formatDate(receipt.createdAt)}`, { marginTop: "5px", fontSize: "10px", lineHeight: "1.5", color: "#64748b" });
      if (isImageReceipt(receipt.mimeType)) {
        const imageFrame = document.createElement("div");
        Object.assign(imageFrame.style, { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "142px", marginTop: "10px", border: "1px solid #e2e8f0", background: "#ffffff", overflow: "hidden" });
        const image = document.createElement("img");
        image.src = receipt.url;
        image.alt = `收據縮圖：${receipt.fileName}`;
        image.crossOrigin = "anonymous";
        image.dataset.reimbursementReceiptThumbnail = "true";
        Object.assign(image.style, { display: "block", maxWidth: "100%", maxHeight: "210px", objectFit: "contain" });
        image.addEventListener("error", () => {
          image.remove();
          addText(imageFrame, "圖片縮圖無法載入；請依附件名稱於系統查看原始檔案", { padding: "12px", fontSize: "11px", lineHeight: "1.5", color: "#64748b", textAlign: "center" });
        }, { once: true });
        imageFrame.append(image);
        card.append(imageFrame);
      } else {
        addText(card, receipt.mimeType === "application/pdf" ? "PDF 收據已列入附件清單；請於系統查看原始檔案" : "非圖片附件已列入清單；請於系統查看原始檔案", { marginTop: "10px", padding: "12px", border: "1px dashed #94a3b8", fontSize: "11px", lineHeight: "1.5", color: "#475569", background: "#ffffff" });
      }
      receiptList.append(card);
    });
    sheet.append(receiptList);
  }

  if (claim.reviewNote?.trim()) {
    const review = document.createElement("section");
    Object.assign(review.style, { marginTop: "20px", padding: "12px 14px", border: "1px solid #fbbf24", background: "#fffbeb" });
    addText(review, "審核說明", { fontSize: "12px", fontWeight: "700", color: "#92400e" });
    addText(review, claim.reviewNote, { marginTop: "6px", fontSize: "13px", lineHeight: "1.65", whiteSpace: "pre-wrap", color: "#451a03" });
    sheet.append(review);
  }

  const footer = document.createElement("footer");
  Object.assign(footer.style, { marginTop: "28px", paddingTop: "12px", borderTop: "1px solid #cbd5e1" });
  addText(footer, `${mode === "pdf" ? "PDF 下載日期" : "列印日期"}：${formatDate(new Date())}　｜　管理人員：${exportedBy.trim() || "系統使用者"}`, { fontSize: "11px", color: "#64748b" });
  addText(footer, "本文件由器材管理系統產生，僅供核銷、稽核及內部存檔使用", { marginTop: "5px", fontSize: "10px", color: "#94a3b8" });
  sheet.append(footer);
  return sheet;
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;
  const imageData = canvas.toDataURL("image/png");
  for (let pageIndex = 0; pageIndex * printableHeight < imageHeight; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imageData, "PNG", margin, margin - pageIndex * printableHeight, printableWidth, imageHeight, undefined, "FAST");
  }
}

async function waitForReceiptThumbnails(sheet: HTMLElement): Promise<void> {
  const images = Array.from(sheet.querySelectorAll<HTMLImageElement>("img[data-reimbursement-receipt-thumbnail='true']"));
  await Promise.all(images.map((image) => new Promise<void>((resolve) => {
    if (image.complete) { resolve(); return; }
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  })));
}

export async function exportReimbursementToPdf(claim: ReimbursementPdfClaim, exportedBy: string): Promise<void> {
  const sheet = createReimbursementSheet(claim, exportedBy, "pdf");
  Object.assign(sheet.style, { position: "fixed", left: "-10000px", top: "0" });
  document.body.append(sheet);
  try {
    await waitForReceiptThumbnails(sheet);
    const canvas = await html2canvas(sheet, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    addCanvasToPdf(pdf, canvas);
    applySystemPdfWatermark(pdf);
    pdf.save(`清水高中媒體服務隊管理系統-報帳單-${claim.claimNumber}.pdf`);
  } finally {
    sheet.remove();
  }
}

export function printReimbursement(claim: ReimbursementPdfClaim, printedBy: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("瀏覽器已封鎖列印視窗，請允許本站開啟彈出式視窗後再試" );
  const sheet = createReimbursementSheet(claim, printedBy, "print");
  printWindow.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" /><title>報帳單 ${claim.claimNumber}</title><style>@page { size: A4; margin: 10mm; } body { margin: 0; background: #fff; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } section { width: auto !important; min-height: auto !important; padding: 0 !important; } }</style></head><body>${sheet.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 200);
}
