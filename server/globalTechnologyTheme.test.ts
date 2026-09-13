import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

describe("全站科技感與深淺模式視覺基準", () => {
  it("提供共用科技感 token、工作區網格與頁首強化規則", () => {
    expect(styles).toContain("--qssh-tech-cyan");
    expect(styles).toContain("QSSH Operations Interface: global technology upgrade");
    expect(styles).toContain(".session-main {");
    expect(styles).toContain(".section-header::after");
    expect(styles).toContain(".page-title {");
  });

  it("統一卡片、表格、輸入欄與鍵盤焦點的科技化互動呈現", () => {
    expect(styles).toContain(".data-table th");
    expect(styles).toContain(".industrial-input,");
    expect(styles).toContain(".session-main :is(button, a, input, textarea, select, [role=\"button\"], [role=\"combobox\"]):focus-visible");
    expect(styles).toContain(".btn-primary {");
    expect(styles).not.toContain(".sidebar-item::after");
    expect(styles).toContain(".session-sidebar-brand::after");
  });

  it("不裁切側欄外側的既有個人與通知彈出選單", () => {
    expect(styles).toContain(".session-sidebar,\n.session-mobile-header { position: relative; }");
    expect(styles).toContain(".session-mobile-header { overflow: hidden; }");
    expect(styles).not.toContain(".session-sidebar,\n.session-mobile-header {\n  position: relative;\n  overflow: hidden;\n}");
  });

  it("為淺色模式提供獨立高對比的工作區、表格及表單規則", () => {
    expect(styles).toContain("html:not(.dark) .session-main");
    expect(styles).toContain("html:not(.dark) .data-table");
    expect(styles).toContain("html:not(.dark) .industrial-input,");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("為淺色模式保留可辨識的命令面板網格、冷色光效及鍵盤互動狀態", () => {
    expect(styles).toContain("Light-mode command deck refinement");
    expect(styles).toContain("html:not(.dark) .section-header::before");
    expect(styles).toContain("html:not(.dark) .industrial-input:focus");
    expect(styles).toContain("html:not(.dark) .session-sidebar-user-popover");
  });

  it("移除分頁背景網格並提升淺色模式文字與框線辨識度", () => {
    expect(styles).toContain("Quiet canvas and high-legibility light mode");
    expect(styles).toContain(".grid-bg { background-image: none !important; }");
    expect(styles).toContain("html:not(.dark) .session-main :is(.text-white");
    expect(styles).toContain("[class*=\"border-black\"]");
    expect(styles).toContain("oklch(0.48 0.095 210 / 0.72)");
  });

  it("還原所有浮層的原始圓滑外觀並保留減少動態偏好", () => {
    expect(styles).toContain("Global command transition and rounded floating surfaces");
    expect(styles).toContain('[data-slot="dropdown-menu-content"]');
    expect(styles).toContain("border-radius: 1rem !important;");
    expect(styles).toContain("border-radius: 1.35rem !important;");
    expect(styles).toContain(".page-transition-overlay { display: none; }");
  });
});
