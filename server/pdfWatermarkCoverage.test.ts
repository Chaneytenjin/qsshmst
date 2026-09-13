import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountActivationSource = readFileSync(new URL("../client/src/lib/accountActivationCertificateExport.ts", import.meta.url), "utf8");
const locationHistorySource = readFileSync(new URL("../client/src/lib/locationHistoryExport.ts", import.meta.url), "utf8");
const qrSource = readFileSync(new URL("../client/src/lib/qrPdfExport.ts", import.meta.url), "utf8");
const reimbursementSource = readFileSync(new URL("../client/src/lib/reimbursementPdf.ts", import.meta.url), "utf8");
const reimbursementAnalysisSource = readFileSync(new URL("../client/src/lib/reimbursementAnalysisExport.ts", import.meta.url), "utf8");
const watermarkSource = readFileSync(new URL("../client/src/lib/pdfWatermark.ts", import.meta.url), "utf8");

describe("PDF 匯出浮水印覆蓋", () => {
  it("共用浮水印工具會以系統名稱逐頁疊印，且維持淡色可讀性", () => {
    expect(watermarkSource).toContain('SYSTEM_PDF_WATERMARK_TEXT = "清水高中媒體服務隊管理系統"');
    expect(watermarkSource).toContain("pdf.getNumberOfPages()");
    expect(watermarkSource).toContain("pdf.setPage(pageNumber)");
    expect(watermarkSource).toContain("pdf.setTextColor(192, 218, 228)");
  });

  it("帳號啟用書、位置異動、器材識別碼、報帳單與報帳分析 PDF 均使用系統浮水印", () => {
    expect(accountActivationSource).toContain('import { SYSTEM_PDF_WATERMARK_TEXT } from "./pdfWatermark"');
    expect(accountActivationSource).toContain("ACCOUNT_ACTIVATION_CERTIFICATE_WATERMARK_TEXT = SYSTEM_PDF_WATERMARK_TEXT");
    expect(locationHistorySource).toContain("applySystemPdfWatermark(pdf)");
    expect(reimbursementSource).toContain("applySystemPdfWatermark(pdf)");
    expect(reimbursementAnalysisSource).toContain("applySystemPdfWatermark(pdf)");
    expect(qrSource).toContain("drawSystemPdfWatermark(page, font, true)");
    expect(qrSource).toContain("drawSystemPdfWatermark(page, font)");
    expect(qrSource).toContain("SYSTEM_PDF_WATERMARK_TEXT");
  });
});
