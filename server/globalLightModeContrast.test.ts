import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("全站淺色模式高對比基準", () => {
  it("為所有登入後分頁統一覆蓋工作區、文字、背景與邊框對比", () => {
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");

    expect(css).toContain("Global authenticated workspace light-mode contrast");
    expect(css).toContain("html:not(.dark) .session-shell");
    expect(css).toContain("html:not(.dark) .session-main :is(.text-gray-400, .text-gray-500, .text-gray-600");
    expect(css).toContain("html:not(.dark) .session-main :is(.bg-gray-50, .bg-gray-100, .bg-slate-50, .bg-slate-100)");
    expect(css).toContain("html:not(.dark) .session-main :is(.border-gray-200, .border-gray-300, .border-slate-200, .border-slate-300)");
  });

  it("為表單、表格、狀態訊息、彈窗與鍵盤焦點提供可讀的淺色對比", () => {
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");

    expect(css).toContain("input:not([type=\"checkbox\"]):not([type=\"radio\"])");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("table:not(.data-table)");
    expect(css).toContain(".bg-amber-50");
    expect(css).toContain(".bg-emerald-50");
    expect(css).toContain(".bg-blue-50");
    expect(css).toContain(".bg-red-50");
    expect(css).toContain('[data-slot="dialog-content"]');
    expect(css).toContain('[data-slot="alert-dialog-content"]');
  });
});
