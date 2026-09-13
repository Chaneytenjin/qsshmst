// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  setPage: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
  getWidth: vi.fn(() => 210),
  getHeight: vi.fn(() => 297),
  jsPDF: vi.fn(),
}));

vi.mock("html2canvas", () => ({ default: mocks.html2canvas }));
vi.mock("jspdf", () => ({ jsPDF: mocks.jsPDF }));

import {
  exportLocationHistoryToCsv,
  exportLocationHistoryToPdf,
  LOCATION_HISTORY_CSV_FILENAME,
  LOCATION_HISTORY_PDF_FILENAME,
} from "../client/src/lib/locationHistoryExport";

const exportData = {
  equipmentName: "Sony A7 相機",
  currentLocation: "攝影器材櫃 A-03",
  entries: [{
    previousLocation: "器材室",
    newLocation: "攝影器材櫃 A-03",
    changedAt: new Date("2026-08-12T08:00:00.000Z"),
    note: "拍攝活動結束後歸位",
    changedByName: "王小明",
    changedByUsername: "wang",
    changedByRealName: null,
    reviewStatus: "approved" as const,
    reviewNote: "位置與交接內容已核對",
    reviewedAt: new Date("2026-08-12T08:30:00.000Z"),
    reviewedByName: "李管理員",
    reviewedByUsername: "admin-li",
    reviewedByRealName: null,
    signatureStatus: "signed" as const,
    signedAt: new Date("2026-08-12T08:45:00.000Z"),
    signedByName: "陳管理員",
    signedByUsername: "admin-chen",
    signedByRealName: null,
  }],
};

describe("位置異動紀錄匯出", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("會產生含移轉原因與操作人員的 UTF-8 CSV 檔案", async () => {
    let savedBlob: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        savedBlob = blob;
        return "blob:location-history";
      }),
      revokeObjectURL: vi.fn(),
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    exportLocationHistoryToCsv(exportData);

    expect(savedBlob).toBeDefined();
    expect(await savedBlob?.text()).toContain("移轉原因／備註");
    expect(await savedBlob?.text()).toContain("拍攝活動結束後歸位");
    expect(await savedBlob?.text()).toContain("覆核狀態");
    expect(await savedBlob?.text()).toContain("已覆核通過");
    expect(await savedBlob?.text()).toContain("已電子簽核");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect((URL.createObjectURL as any)).toHaveBeenCalledOnce();
    expect((URL.revokeObjectURL as any)).toHaveBeenCalledWith("blob:location-history");
    expect(LOCATION_HISTORY_CSV_FILENAME).toContain("位置異動紀錄.csv");
  });

  it("會將篩選後的異動紀錄轉為可下載 PDF，並在完成後移除暫存畫面", async () => {
    const canvas = {
      width: 1200,
      height: 1600,
      toDataURL: vi.fn(() => "data:image/png;base64,LOCATION_HISTORY"),
    };
    const pdf = {
      internal: { pageSize: { getWidth: mocks.getWidth, getHeight: mocks.getHeight } },
      addImage: mocks.addImage,
      addPage: mocks.addPage,
      getNumberOfPages: mocks.getNumberOfPages,
      setPage: mocks.setPage,
      setFont: mocks.setFont,
      setFontSize: mocks.setFontSize,
      setTextColor: mocks.setTextColor,
      text: mocks.text,
      save: mocks.save,
    };
    mocks.html2canvas.mockImplementation(async (sheet: HTMLElement) => {
      expect(sheet).toHaveTextContent("清水高中媒體服務隊管理系統｜器材位置異動稽核紀錄");
      expect(sheet).toHaveTextContent("拍攝活動結束後歸位");
      expect(sheet).toHaveTextContent("位置與交接內容已核對");
      expect(sheet).toHaveTextContent("電子簽核：已完成");
      return canvas;
    });
    mocks.jsPDF.mockReturnValue(pdf);

    await exportLocationHistoryToPdf(exportData);

    expect(mocks.html2canvas).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ backgroundColor: "#ffffff", useCORS: true }));
    expect(mocks.addImage).toHaveBeenCalledWith("data:image/png;base64,LOCATION_HISTORY", "PNG", expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), undefined, "FAST");
    expect(mocks.text).toHaveBeenCalledWith("清水高中媒體服務隊管理系統", expect.any(Number), expect.any(Number), expect.objectContaining({ align: "center", angle: 35 }));
    expect(mocks.save).toHaveBeenCalledWith(LOCATION_HISTORY_PDF_FILENAME);
    expect(document.body).not.toHaveTextContent("器材位置異動稽核紀錄");
  });
});
