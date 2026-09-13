import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { applySystemPdfWatermark } from "./pdfWatermark";

export const LOCATION_HISTORY_CSV_FILENAME = "清水高中媒體服務隊管理系統-器材位置異動紀錄.csv";
export const LOCATION_HISTORY_PDF_FILENAME = "清水高中媒體服務隊管理系統-器材位置異動紀錄.pdf";

export type LocationHistoryExportEntry = {
  previousLocation: string | null;
  newLocation: string | null;
  changedAt: Date | string;
  note: string | null;
  changedByName: string | null;
  changedByUsername: string | null;
  changedByRealName: string | null;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewNote?: string | null;
  reviewedAt?: Date | string | null;
  reviewedByName?: string | null;
  reviewedByUsername?: string | null;
  reviewedByRealName?: string | null;
  signatureStatus?: "unsigned" | "signed";
  signedAt?: Date | string | null;
  signedByName?: string | null;
  signedByUsername?: string | null;
  signedByRealName?: string | null;
};

export type LocationHistoryExportData = {
  equipmentName: string;
  currentLocation: string | null | undefined;
  entries: LocationHistoryExportEntry[];
  exportedBy?: string | null;
};

function getOperatorName(entry: LocationHistoryExportEntry): string {
  return entry.changedByRealName || entry.changedByName || entry.changedByUsername || "未知使用者";
}

function getReviewerName(entry: LocationHistoryExportEntry): string {
  return entry.reviewedByRealName || entry.reviewedByName || entry.reviewedByUsername || "—";
}

function getSignerName(entry: LocationHistoryExportEntry): string {
  return entry.signedByRealName || entry.signedByName || entry.signedByUsername || "—";
}

function getReviewLabel(entry: LocationHistoryExportEntry): string {
  return entry.reviewStatus === "approved" ? "已覆核通過" : entry.reviewStatus === "rejected" ? "覆核退回" : "待管理員覆核";
}

function formatChangedAt(value: Date | string): string {
  return new Date(value).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportLocationHistoryToCsv(data: LocationHistoryExportData): void {
  const rows = [
    ["器材名稱", "異動時間", "原存放位置", "新存放位置", "操作人員", "移轉原因／備註", "覆核狀態", "覆核人員", "覆核時間", "覆核意見", "電子簽核狀態", "簽核人員", "簽核時間"],
    ...data.entries.map((entry) => [
      data.equipmentName,
      formatChangedAt(entry.changedAt),
      entry.previousLocation || "初始位置",
      entry.newLocation || "未設定",
      getOperatorName(entry),
      entry.note || "",
      getReviewLabel(entry),
      getReviewerName(entry),
      entry.reviewedAt ? formatChangedAt(entry.reviewedAt) : "",
      entry.reviewNote || "",
      entry.signatureStatus === "signed" ? "已電子簽核" : "尚未電子簽核",
      getSignerName(entry),
      entry.signedAt ? formatChangedAt(entry.signedAt) : "",
    ]),
  ];
  const csv = `\ufeff${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), LOCATION_HISTORY_CSV_FILENAME);
}

function createAuditSheet(data: LocationHistoryExportData): HTMLElement {
  const sheet = document.createElement("section");
  Object.assign(sheet.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "760px",
    padding: "36px",
    background: "#ffffff",
    color: "#111827",
    fontFamily: "Arial, 'Noto Sans TC', sans-serif",
  });

  const header = document.createElement("header");
  header.textContent = "清水高中媒體服務隊管理系統｜器材位置異動稽核紀錄";
  Object.assign(header.style, { fontSize: "22px", fontWeight: "700", borderBottom: "2px solid #111827", paddingBottom: "14px" });
  sheet.append(header);

  const meta = document.createElement("p");
  meta.textContent = `器材：${data.equipmentName}　｜　目前位置：${data.currentLocation?.trim() || "未設定"}`;
  Object.assign(meta.style, { margin: "16px 0 8px", fontSize: "14px", color: "#374151" });
  sheet.append(meta);

  const generatedAt = document.createElement("p");
  generatedAt.textContent = `PDF 下載日期：${new Date().toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })}　｜　管理人員：${data.exportedBy?.trim() || "系統管理人員"}`;
  Object.assign(generatedAt.style, { margin: "0 0 22px", fontSize: "12px", color: "#6b7280" });
  sheet.append(generatedAt);

  data.entries.forEach((entry, index) => {
    const item = document.createElement("article");
    Object.assign(item.style, { border: "1px solid #d1d5db", borderLeft: "4px solid #2563eb", marginBottom: "12px", padding: "14px" });

    const movement = document.createElement("p");
    movement.textContent = `${entry.previousLocation || "初始位置"}　→　${entry.newLocation || "未設定"}`;
    Object.assign(movement.style, { margin: "0", fontSize: "16px", fontWeight: "700" });
    item.append(movement);

    const details = document.createElement("p");
    details.textContent = `#${data.entries.length - index}　${formatChangedAt(entry.changedAt)}　｜　操作人員：${getOperatorName(entry)}`;
    Object.assign(details.style, { margin: "8px 0 0", fontSize: "12px", color: "#4b5563" });
    item.append(details);

    if (entry.note) {
      const note = document.createElement("p");
      note.textContent = `移轉原因／備註：${entry.note}`;
      Object.assign(note.style, { margin: "8px 0 0", fontSize: "13px", color: "#1f2937" });
      item.append(note);
    }
    const review = document.createElement("p");
    review.textContent = `覆核狀態：${getReviewLabel(entry)}${entry.reviewedAt ? `　｜　覆核人員：${getReviewerName(entry)}　｜　覆核時間：${formatChangedAt(entry.reviewedAt)}` : ""}${entry.reviewNote ? `　｜　覆核意見：${entry.reviewNote}` : ""}`;
    Object.assign(review.style, { margin: "8px 0 0", fontSize: "12px", color: "#374151" });
    item.append(review);
    const signature = document.createElement("p");
    signature.textContent = entry.signatureStatus === "signed" && entry.signedAt ? `電子簽核：已完成　｜　簽核人員：${getSignerName(entry)}　｜　簽核時間：${formatChangedAt(entry.signedAt)}　｜　方式：已登入帳號電子簽核` : "電子簽核：尚未完成";
    Object.assign(signature.style, { margin: "6px 0 0", fontSize: "12px", color: entry.signatureStatus === "signed" ? "#075985" : "#6b7280" });
    item.append(signature);
    sheet.append(item);
  });

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

export async function exportLocationHistoryToPdf(data: LocationHistoryExportData): Promise<void> {
  const sheet = createAuditSheet(data);
  document.body.append(sheet);
  try {
    const canvas = await html2canvas(sheet, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    addCanvasToPdf(pdf, canvas);
    applySystemPdfWatermark(pdf);
    pdf.save(LOCATION_HISTORY_PDF_FILENAME);
  } finally {
    sheet.remove();
  }
}
