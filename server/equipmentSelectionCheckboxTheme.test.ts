import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/EquipmentManage.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("器材清單勾選欄主題樣式", () => {
  it("為全選與單筆選取欄套用共用的低調深色模式樣式", () => {
    expect(pageSource.match(/className="equipment-selection-checkbox"/g)).toHaveLength(2);
    expect(styles).toContain(".equipment-management-page .equipment-selection-checkbox {");
    expect(styles).toContain("accent-color: oklch(0.54 0.09 210);");
    expect(styles).toContain("opacity: 0.78;");
  });

  it("保留勾選狀態及鍵盤焦點的清楚回饋", () => {
    expect(styles).toContain(".equipment-management-page .equipment-selection-checkbox:checked {");
    expect(styles).toContain(".equipment-management-page .equipment-selection-checkbox:focus-visible");
  });
});
