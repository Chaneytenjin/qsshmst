// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadMultiMonthReimbursementSummaryCsv } from "../client/src/lib/reimbursementSummaryExport";

describe("多月報帳分類 CSV 匯出", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("會依月份排序，保留各月合計並加入全部月份總計", async () => {
    const createObjectUrl = vi.fn(() => "blob:reimbursement-summary");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    let downloadedAnchor: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedAnchor = this;
    });

    downloadMultiMonthReimbursementSummaryCsv([
      { month: "2026-08", totalAmount: 540, claimCount: 1, categories: [{ category: "耗材", totalAmount: 540, itemCount: 1 }] },
      { month: "2026-07", totalAmount: 1200, claimCount: 2, categories: [{ category: "交通", totalAmount: 1200, itemCount: 2 }] },
    ]);

    const blob = createObjectUrl.mock.calls[0]?.[0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain('"2026-07","交通","1200.00","2","2"');
    expect(csv).toContain('"2026-07","合計","1200.00","2","2"');
    expect(csv).toContain('"2026-08","耗材","540.00","1","1"');
    expect(csv).toContain('"全部月份","總計","1740.00","3","3"');
    expect(downloadedAnchor?.download).toBe("清水高中媒體服務隊管理系統-報帳分類支出統計-2026-07-至-2026-08.csv");
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:reimbursement-summary");
  });
});
