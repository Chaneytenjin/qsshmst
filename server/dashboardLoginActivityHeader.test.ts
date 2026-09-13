import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const dashboard = readFileSync(resolve(root, "client/src/pages/Dashboard.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("登入活動總覽標題框", () => {
  it("提供獨立且可測試的標題框容器", () => {
    expect(dashboard).toContain('className="dashboard-login-activity-header"');
    expect(dashboard).toContain('data-testid="dashboard-login-activity-header"');
    expect(dashboard).toContain('className="dashboard-login-activity-summary"');
    expect(dashboard).toContain('aria-label="近七日登入摘要"');
  });

  it("在深淺模式均維持緊湊矩形框線與統計文字可讀性", () => {
    expect(styles).toContain("Dashboard login activity title frame");
    expect(styles).toContain(".dashboard-login-activity-header {");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(styles).toContain("border-radius: 0.45rem;");
    expect(styles).toContain(".dashboard-login-activity-summary");
    expect(styles).toContain("html:not(.dark) .dashboard-login-activity-header");
  });
});
