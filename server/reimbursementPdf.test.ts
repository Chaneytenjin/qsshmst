// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  pdfSave: vi.fn(),
  watermarkText: vi.fn(),
  capturedSheet: null as HTMLElement | null,
}));

vi.mock("html2canvas", () => ({ default: mocks.html2canvas }));
vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage = vi.fn();
    addImage = vi.fn();
    getNumberOfPages = () => 1;
    setPage = vi.fn();
    setFont = vi.fn();
    setFontSize = vi.fn();
    setTextColor = vi.fn();
    text = mocks.watermarkText;
    save = mocks.pdfSave;
  },
}));

import { exportReimbursementToPdf } from "../client/src/lib/reimbursementPdf";

describe("報帳 PDF 收據附件輸出", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("會在 PDF 文件中加入圖片縮圖與所有附件的詳細清單", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
    mocks.html2canvas.mockImplementation(async (sheet: HTMLElement) => {
      mocks.capturedSheet = sheet;
      return { width: 760, height: 900, toDataURL: () => "data:image/png;base64,AAAA" };
    });

    await exportReimbursementToPdf({
      claimNumber: "RB20260815-1234",
      title: "活動耗材",
      purpose: "社團活動使用",
      totalAmount: "540.00",
      requesterUsername: "student",
      requesterName: "學生",
      requesterRealName: "學生甲",
      reviewerUsername: "teacher",
      reviewerName: "教師",
      reviewerRealName: "教師乙",
      reviewedAt: new Date("2026-08-15T08:00:00Z"),
      reviewNote: "核對完成",
      status: "approved",
      items: [{ expenseDate: new Date("2026-08-12T00:00:00Z"), category: "耗材", merchant: "文具店", description: "紙張", amount: "540.00" }],
      receipts: [
        { fileName: "receipt.jpg", url: "data:image/jpeg;base64,AAAA", mimeType: "image/jpeg", sizeBytes: 2048, createdAt: new Date("2026-08-12T01:00:00Z") },
        { fileName: "receipt.pdf", url: "/manus-storage/receipt.pdf", mimeType: "application/pdf", sizeBytes: 4096, createdAt: new Date("2026-08-12T01:05:00Z") },
      ],
    }, "管理人員");

    expect(mocks.capturedSheet?.textContent).toContain("收據附件");
    expect(mocks.capturedSheet?.textContent).toContain("附件 1｜receipt.jpg");
    expect(mocks.capturedSheet?.textContent).toContain("附件 2｜receipt.pdf");
    expect(mocks.capturedSheet?.textContent).toContain("PDF 收據已列入附件清單");
    expect(mocks.capturedSheet?.querySelector("img[data-reimbursement-receipt-thumbnail='true']")?.getAttribute("src")).toBe("data:image/jpeg;base64,AAAA");
    expect(mocks.watermarkText).toHaveBeenCalledWith("清水高中媒體服務隊管理系統", expect.any(Number), expect.any(Number), expect.objectContaining({ align: "center", angle: 35 }));
    expect(mocks.pdfSave).toHaveBeenCalledWith("清水高中媒體服務隊管理系統-報帳單-RB20260815-1234.pdf");
  });
});
