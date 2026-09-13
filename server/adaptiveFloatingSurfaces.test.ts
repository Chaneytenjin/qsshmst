import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("自適應矩形彈出視窗", () => {
  it("對話框保留原始圓角、尺寸與互動行為，不加入分級放大設定", () => {
    const dialog = readFileSync("client/src/components/ui/dialog.tsx", "utf8");
    const alertDialog = readFileSync("client/src/components/ui/alert-dialog.tsx", "utf8");

    expect(dialog).toContain("rounded-lg border p-6");
    expect(dialog).not.toContain("isExpandedForOverflow");
    expect(alertDialog).toContain("rounded-lg border p-6");
    expect(alertDialog).not.toContain("isExpandedForOverflow");
  });

  it("浮層恢復原始尺寸與圓角，不加入後續自適應覆寫", () => {
    const popover = readFileSync("client/src/components/ui/popover.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(popover).toContain("z-50 w-72");
    expect(popover).toContain("rounded-md border p-4");
    expect(css).toContain("Global command transition and rounded floating surfaces");
    expect(css).toContain("border-radius: 1rem !important;");
    expect(css).toContain("border-radius: 1.35rem !important;");
    expect(css).not.toContain(".dialog-content--expanded");
  });
});
