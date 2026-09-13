import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const reportsSource = readFileSync(new URL("../client/src/pages/SystemReports.tsx", import.meta.url), "utf8");
const statisticsSource = readFileSync(new URL("../client/src/pages/SystemReportStatistics.tsx", import.meta.url), "utf8");
const createdSource = readFileSync(new URL("../client/src/pages/SystemReportCreated.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const subnavSource = readFileSync(new URL("../client/src/components/SystemReportSubnav.tsx", import.meta.url), "utf8");
const reimbursementsSource = readFileSync(new URL("../client/src/pages/Reimbursements.tsx", import.meta.url), "utf8");


describe("系統報告淺色模式與子頁", () => {
  it("主頁保留建立報告入口並提供兩個獨立子頁導覽", () => {
    expect(reportsSource).toContain("system-reports-page");
    expect(reportsSource).toContain("system-reports-composer");
    expect(reportsSource).toContain("aria-label=\"建立系統報告\"");
    expect(reportsSource).toContain("<SystemReportSubnav />");
    expect(subnavSource).toContain("/system-reports/reading-statistics");
    expect(subnavSource).toContain("/system-reports/created-reports");
    expect(subnavSource).toContain("aria-current={isActive ? \"page\" : undefined}");
  });

  it("閱讀統計與已建立報告均移轉至獨立子頁且保留報告資料操作", () => {
    expect(statisticsSource).toContain("system-reports-statistics-card");
    expect(statisticsSource).toContain("system-reports-read-progress-track");
    expect(statisticsSource).toContain("已發布報告閱讀統計");
    expect(createdSource).toContain("system-reports-list");
    expect(createdSource).toContain("system-reports-list-item");
    expect(createdSource).toContain("已建立的報告");
    expect(createdSource).toContain("/system-reports?edit=${report.id}");
    expect(appSource).toContain("path=\"/system-reports/reading-statistics\"");
    expect(appSource).toContain("path=\"/system-reports/created-reports\"");
  });

  it("為系統報告子頁與報帳付款狀態提供淺色模式高對比樣式", () => {
    expect(styles).toContain(".system-reports-subnav-link");
    expect(styles).toContain(".system-reports-back-link");
    expect(styles).toContain("html:not(.dark) .system-reports-subnav-link");
    expect(styles).toContain("html:not(.dark) .system-reports-back-link");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursement-status-badge[data-status=\"paid\"]");
    expect(reimbursementsSource).toContain("max-w-5xl");
    expect(reimbursementsSource).toContain("max-h-[calc(100dvh-2rem)]");
  });
});
