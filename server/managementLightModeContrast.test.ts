import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("管理頁淺色模式可讀性", () => {
  it("器材管理具有專用根範圍與彈窗標記，避免深色固定底色在淺色模式殘留", () => {
    const page = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/pages/EquipmentManage.tsx", "utf8");
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");

    expect(page).toContain('className="equipment-management-page animate-fade-in"');
    expect(page.match(/equipment-management-dialog/g)?.length).toBeGreaterThanOrEqual(10);
    expect(css).toContain("html:not(.dark) .equipment-management-page .data-table thead");
    expect(css).toContain("html:not(.dark) .equipment-management-page .data-table .equipment-action-button");
    expect(css).toContain(".equipment-action-button {");
    expect(css).toContain("html:not(.dark) .equipment-management-dialog");
  });

  it("位置異動月度稽核具有專用淺色模式圖表、篩選、摘要與表格對比", () => {
    const page = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/pages/LocationAuditReport.tsx", "utf8");
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");

    expect(page).toContain("location-audit-report");
    expect(css).toContain("html:not(.dark) .location-audit-report > section:first-child");
    expect(css).toContain("html:not(.dark) .location-audit-report article");
    expect(css).toContain("html:not(.dark) .location-audit-report .recharts-cartesian-axis-tick-value");
    expect(css).toContain("html:not(.dark) .location-audit-report table thead");
  });
});
