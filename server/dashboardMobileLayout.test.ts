import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("總覽手機版比例與個人選單外觀", () => {
  const dashboard = readFileSync("client/src/pages/Dashboard.tsx", "utf8");
  const sidebar = readFileSync("client/src/components/AppLayout.tsx", "utf8");
  const stylesheet = readFileSync("client/src/index.css", "utf8");

  it("在窄螢幕為統計卡、報帳操作列與圖表提供專用比例規則", () => {
    expect(dashboard).toContain('className="dashboard-stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"');
    expect(dashboard).toContain("dashboard-reimbursement-actions");
    expect(dashboard).toContain("dashboard-reimbursement-chart reimbursement-category-chart");
    expect(dashboard).toContain("dashboard-reimbursement-chart reimbursement-trend-chart");
    expect(stylesheet).toContain("@media (max-width: 40rem) {");
    expect(stylesheet).toContain(".dashboard-stat-grid .stat-card { min-height: 8.35rem; padding: 0.9rem; }");
    expect(stylesheet).toContain(".dashboard-reimbursement-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }");
    expect(stylesheet).toContain(".dashboard-reimbursement-chart { height: 14.25rem !important; }");
    expect(stylesheet).toContain(".dashboard-chart-viewport { overflow: hidden; }");
    expect(stylesheet).toContain(".dashboard-reimbursement-chart { width: 100% !important; min-width: 0 !important; max-width: 100% !important; overflow: hidden !important; contain: paint; }");
    expect(stylesheet).toContain(".dashboard-reimbursement-chart .recharts-tooltip-wrapper,");
    expect(stylesheet).toContain(".dashboard-reimbursement-chart .recharts-cartesian-axis-tick:nth-child(even) { display: none; }");
    expect(stylesheet).toContain("@media (max-width: 20rem) {");
    expect(stylesheet).toContain(".dashboard-reimbursement-chart .recharts-cartesian-axis-tick:nth-child(odd) { display: none; }");
    expect(dashboard).toContain('className="dashboard-pending-stat-card" href="/requests"');
    expect(stylesheet).toContain(".dashboard-pending-stat-card { border-color: var(--accent) !important;");
    expect(stylesheet).toContain("html:not(.dark) .dashboard-pending-stat-card { border-color: var(--accent) !important;");
    expect(dashboard).toContain('className="dashboard-overdue-stat-card" href="/records"');
    expect(stylesheet).toContain(".dashboard-overdue-stat-card { border-color: var(--accent) !important;");
    expect(stylesheet).toContain("html:not(.dark) .dashboard-overdue-stat-card { border-color: var(--accent) !important;");
  });

  it("移除個人頭像列右側箭頭，仍保留可存取的選單按鈕與展開狀態", () => {
    expect(sidebar).toContain('aria-label="使用者選單"');
    expect(sidebar).toContain("aria-expanded={userMenuOpen}");
    expect(sidebar).not.toContain('ChevronDown size={15}');
  });
});
