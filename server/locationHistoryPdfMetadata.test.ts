// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

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

import { exportLocationHistoryToPdf } from "../client/src/lib/locationHistoryExport";

describe("位置異動 PDF 管理資訊", () => {
  it("會在 PDF 內容標示下載日期與管理人員", async () => {
    const canvas = { width: 1200, height: 1600, toDataURL: vi.fn(() => "data:image/png;base64,LOCATION") };
    const pdf = { internal: { pageSize: { getWidth: mocks.getWidth, getHeight: mocks.getHeight } }, addImage: mocks.addImage, addPage: mocks.addPage, getNumberOfPages: mocks.getNumberOfPages, setPage: mocks.setPage, setFont: mocks.setFont, setFontSize: mocks.setFontSize, setTextColor: mocks.setTextColor, text: mocks.text, save: mocks.save };
    mocks.html2canvas.mockImplementation(async (sheet: HTMLElement) => {
      expect(sheet.textContent).toContain("PDF 下載日期：");
      expect(sheet.textContent).toContain("管理人員：林管理員");
      return canvas;
    });
    mocks.jsPDF.mockReturnValue(pdf);

    await exportLocationHistoryToPdf({
      equipmentName: "Sony A7 相機",
      currentLocation: "器材室 A",
      exportedBy: "林管理員",
      entries: [{ previousLocation: "器材室 B", newLocation: "器材室 A", changedAt: new Date(), note: "盤點後調整", changedByName: "王同學", changedByUsername: "wang", changedByRealName: null }],
    });

    expect(mocks.save).toHaveBeenCalledWith("清水高中媒體服務隊管理系統-器材位置異動紀錄.pdf");
    expect(document.body.textContent).not.toContain("林管理員");
  });
});
