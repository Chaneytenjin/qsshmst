import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const pageSource = readFileSync(resolve(projectRoot, "client/src/pages/SystemManagementOverview.tsx"), "utf8");
const stylesheet = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("管理功能子頁選單淺色模式", () => {
  it("為功能卡片的標題、數量與進入操作建立明確樣式鉤子", () => {
    expect(pageSource).toContain("system-management-overview-section-heading");
    expect(pageSource).toContain("system-management-overview-count");
    expect(pageSource).toContain("system-management-overview-card-action");
  });

  it("涵蓋淺色模式的卡片、圖示、文字、懸停與鍵盤焦點狀態", () => {
    expect(stylesheet).toContain('html:not(.dark) [data-testid="system-management-overview"] .system-management-overview-card');
    expect(stylesheet).toContain(".system-management-overview-card:hover");
    expect(stylesheet).toContain(".system-management-overview-card:focus-visible");
    expect(stylesheet).toContain(".system-management-overview-card-icon");
    expect(stylesheet).toContain(".system-management-overview-card-action");
  });
});
