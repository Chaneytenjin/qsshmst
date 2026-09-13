import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const pageSource = readFileSync(resolve(projectRoot, "client/src/pages/SystemMaintenance.tsx"), "utf8");
const stylesheet = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("系統設定淺色模式", () => {
  it("為系統維護卡片、狀態與主要操作建立可辨識的樣式鉤子", () => {
    expect(pageSource).toContain("system-maintenance-card");
    expect(pageSource).toContain("system-maintenance-status-card--${systemMode}");
    expect(pageSource).toContain("system-maintenance-action-button");
    expect(pageSource).toContain("system-maintenance-fields-panel");
  });

  it("涵蓋淺色模式的文字、欄位、狀態、懸停、焦點與停用狀態", () => {
    expect(stylesheet).toContain('html:not(.dark) [data-testid="system-maintenance-page"] .system-maintenance-card');
    expect(stylesheet).toContain(".system-maintenance-status-card--online");
    expect(stylesheet).toContain(".system-maintenance-status-card--maintenance");
    expect(stylesheet).toContain(".system-maintenance-status-card--offline");
    expect(stylesheet).toContain(".system-maintenance-action-button:hover:not(:disabled)");
    expect(stylesheet).toContain(".system-maintenance-action-button:focus-visible");
    expect(stylesheet).toContain(".system-maintenance-action-button:disabled");
  });
});
