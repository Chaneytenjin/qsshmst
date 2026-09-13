import type { jsPDF } from "jspdf";

export const SYSTEM_PDF_WATERMARK_TEXT = "清水高中媒體服務隊管理系統";

/**
 * 將淡色系統識別浮水印覆蓋在既有 PDF 內容上
 * 匯出內容完成後呼叫，會逐頁加入，確保多頁文件不遺漏
 */
export function applySystemPdfWatermark(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(192, 218, 228);
    pdf.text(SYSTEM_PDF_WATERMARK_TEXT, pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
  }
}
