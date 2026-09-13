import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { SYSTEM_PDF_WATERMARK_TEXT } from "./pdfWatermark";

export const ACCOUNT_ACTIVATION_CERTIFICATE_PDF_FILENAME = "清水高中媒體服務隊管理系統-帳號啟用書.pdf";
export const ACCOUNT_ACTIVATION_CERTIFICATE_SEAL_URL = "/storage/qingshui-media-service-circular-seal-alpha_cf98cb70.png";
export const ACCOUNT_ACTIVATION_CERTIFICATE_WATERMARK_TEXT = SYSTEM_PDF_WATERMARK_TEXT;

export type AccountActivationCertificateExportData = {
  id: number;
  username: string | null;
  name: string | null;
  role: "admin" | "teacher" | "student";
  createdAt: Date | string;
  isTemporaryPassword: boolean;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function formatRole(role: AccountActivationCertificateExportData["role"]): string {
  return { admin: "管理員", teacher: "教師", student: "學生" }[role];
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

function certificateNumber(account: AccountActivationCertificateExportData): string {
  const createdAt = new Date(account.createdAt);
  const suffix = Number.isFinite(createdAt.getTime()) ? createdAt.getTime().toString(36).toUpperCase() : "UNKNOWN";
  return `QSM-ACT-${account.id}-${suffix}`;
}

export function buildAccountActivationCertificateHtml(account: AccountActivationCertificateExportData): string {
  const accountLabel = account.username || account.name || `帳號 #${account.id}`;
  const passwordStatus = account.isTemporaryPassword ? "待首次登入變更密碼" : "用戶已更改密碼";
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>帳號啟用書</title><style>body{margin:0;background:#fff;color:#17202a;font-family:Arial,'Noto Sans TC',sans-serif}.sheet{position:relative;width:760px;margin:0 auto;padding:42px;box-sizing:border-box;overflow:hidden}.sheet>*:not(.watermark){position:relative;z-index:1}.watermark{position:absolute;z-index:0;left:36px;right:36px;top:382px;transform:rotate(-33deg);color:rgba(14,116,144,.065);font-size:38px;font-weight:700;letter-spacing:5px;text-align:center;white-space:nowrap;pointer-events:none}.header{position:relative;background:#10212f;color:#fff;padding:28px}.header p{margin:0 0 8px;font-size:12px;letter-spacing:1.6px}.header h1{margin:0;font-size:28px}.seal{position:absolute;right:28px;top:12px;width:74px;height:74px;object-fit:contain}.meta{margin:30px 0 20px;color:#52606d}.row{display:grid;grid-template-columns:36% 1fr;border-bottom:1px solid #e5e7eb;padding:12px 0}.key{color:#52606d}.value{font-weight:600}.status{margin-top:24px;padding:16px;border-left:4px solid #1e6fa8;background:#eef6fb;color:#28475e}.note{margin-top:24px;font-size:12px;color:#64748b;line-height:1.65}@media print{.sheet{width:auto;padding:0}.header{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><main class="sheet"><div class="watermark">${ACCOUNT_ACTIVATION_CERTIFICATE_WATERMARK_TEXT}</div><header class="header"><p>QINGSHUI HIGH SCHOOL · MEDIA SQUAD</p><h1>帳號啟用書</h1><img class="seal" src="${ACCOUNT_ACTIVATION_CERTIFICATE_SEAL_URL}" alt="媒服隊啟用書附件專屬章戳" /></header><p class="meta">此文件由清水高中媒體服務隊器材管理系統發行，供帳號建置與實體存檔使用</p><section><div class="row"><span class="key">啟用書編號</span><span class="value">${escapeHtml(certificateNumber(account))}</span></div><div class="row"><span class="key">帳號名稱</span><span class="value">${escapeHtml(account.username || "未設定自訂帳號")}</span></div><div class="row"><span class="key">姓名／顯示名稱</span><span class="value">${escapeHtml(account.name || accountLabel)}</span></div><div class="row"><span class="key">系統角色</span><span class="value">${escapeHtml(formatRole(account.role))}</span></div><div class="row"><span class="key">帳號建立時間</span><span class="value">${escapeHtml(formatDate(account.createdAt))}</span></div><div class="row"><span class="key">發行時間</span><span class="value">${escapeHtml(formatDate(new Date()))}</span></div></section><aside class="status">密碼狀態：<strong>${escapeHtml(passwordStatus)}</strong>本列印／PDF 文件不包含密碼、臨時密碼、驗證碼或其他登入憑證</aside><p class="note">若非預期持有人，請聯絡系統管理員系統不會透過本輸出揭露登入憑證</p></main></body></html>`;
}

function createPrintableSheet(account: AccountActivationCertificateExportData): HTMLElement {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "840px", height: "1100px", border: "0" });
  document.body.append(frame);
  const frameDocument = frame.contentDocument;
  if (!frameDocument) throw new Error("無法建立啟用書輸出文件");
  frameDocument.open();
  frameDocument.write(buildAccountActivationCertificateHtml(account));
  frameDocument.close();
  return frame;
}

export async function exportAccountActivationCertificateToPdf(account: AccountActivationCertificateExportData): Promise<void> {
  const frame = createPrintableSheet(account) as HTMLIFrameElement;
  try {
    const sheet = frame.contentDocument?.querySelector(".sheet") as HTMLElement | null;
    if (!sheet) throw new Error("無法建立啟用書輸出內容");
    const canvas = await html2canvas(sheet, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const margin = 10;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, width, height, undefined, "FAST");
    pdf.save(ACCOUNT_ACTIVATION_CERTIFICATE_PDF_FILENAME);
  } finally {
    frame.remove();
  }
}

export function printAccountActivationCertificate(account: AccountActivationCertificateExportData): void {
  const printWindow = window.open("", "account-activation-certificate", "noopener,noreferrer,width=900,height=900");
  if (!printWindow) throw new Error("瀏覽器已封鎖列印視窗，請允許彈出視窗後重試");
  printWindow.document.open();
  printWindow.document.write(buildAccountActivationCertificateHtml(account));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 100);
}
