// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  addPage: vi.fn(),
  drawText: vi.fn(),
  drawRectangle: vi.fn(),
  embedFont: vi.fn(),
  registerFontkit: vi.fn(),
  save: vi.fn(),
  barcode: vi.fn(),
  createQr: vi.fn(),
}));

vi.mock("pdf-lib", () => ({ PDFDocument: { create: mocks.createDocument }, degrees: (angle: number) => angle, rgb: (...values: number[]) => values }));
vi.mock("@pdf-lib/fontkit", () => ({ default: {} }));
vi.mock("qrcode", () => ({ default: { create: mocks.createQr } }));
vi.mock("jsbarcode", () => ({ default: mocks.barcode }));

import { exportQrPrintSheetToPdf, QR_PDF_FILENAME } from "../client/src/lib/qrPdfExport";

describe("器材識別碼結構化 PDF 匯出", () => {
  function setupPdf() {
    vi.clearAllMocks();
    const pages: any[] = [];
    const page = { getWidth: () => 595, getHeight: () => 842, getSize: () => ({ width: 595, height: 842 }), drawText: mocks.drawText, drawRectangle: mocks.drawRectangle };
    const pdf = {
      registerFontkit: mocks.registerFontkit,
      embedFont: mocks.embedFont,
      addPage: vi.fn(() => { pages.push(page); return page; }),
      getPages: () => pages,
      getPageCount: () => pages.length,
      save: mocks.save,
    };
    mocks.createDocument.mockResolvedValue(pdf);
    mocks.embedFont.mockResolvedValue({ widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.8 });
    mocks.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.createQr.mockReturnValue({ modules: { size: 2, data: [true, false, false, true] } });
    mocks.barcode.mockImplementation((svg: SVGSVGElement) => {
      svg.setAttribute("width", "40"); svg.setAttribute("height", "48");
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", "2"); bar.setAttribute("y", "0"); bar.setAttribute("width", "4"); bar.setAttribute("height", "48"); svg.append(bar);
    });
    return pdf;
  }

  it("以原生可搜尋文字與向量 QR／Barcode 繪製 A4 PDF，不擷取畫面", async () => {
    setupPdf();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:pdf"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await exportQrPrintSheetToPdf({
      items: [{ id: 8, name: "Sony A7 相機", codeId: "QSSHMST0008", location: "攝影器材櫃 A-03", status: "available" }],
      codeMode: "both",
      labelPaperSize: "a4-3x2",
      downloadedBy: "王管理員",
    });

    expect(mocks.registerFontkit).toHaveBeenCalled();
    expect(mocks.drawText).toHaveBeenCalledWith("Sony A7 相機", expect.objectContaining({ font: expect.anything() }));
    expect(mocks.drawText).toHaveBeenCalledWith("QSSHMST0008", expect.anything());
    expect(mocks.drawText).toHaveBeenCalledWith("清水高中媒體服務隊管理系統", expect.objectContaining({ opacity: 0.42, rotate: 35 }));
    expect(mocks.drawRectangle).toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalled();
    expect(document.querySelector('a[download]')?.getAttribute("download")).toBe(QR_PDF_FILENAME);
  });

  it("以標籤機 62 × 29 mm 尺寸為每個器材建立獨立向量 PDF 頁面", async () => {
    const pdf = setupPdf();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:pdf"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await exportQrPrintSheetToPdf({
      items: [
        { id: 8, name: "相機", codeId: "QSSHMST0008", location: "A-01" },
        { id: 9, name: "麥克風", codeId: "QSSHMST0009", location: "B-02" },
      ],
      codeMode: "barcode",
      labelPaperSize: "label-62x29",
    });

    expect(pdf.addPage).toHaveBeenCalledTimes(2);
    expect(mocks.drawText).toHaveBeenCalledWith("相機", expect.anything());
    expect(mocks.drawText).toHaveBeenCalledWith("麥克風", expect.anything());
    expect(mocks.drawText).toHaveBeenCalledWith("清水高中媒體服務隊", expect.objectContaining({ opacity: 0.32 }));
    expect(mocks.barcode).toHaveBeenCalledTimes(2);
  });
});
