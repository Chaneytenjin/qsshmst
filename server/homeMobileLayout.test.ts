import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("手機版主頁排版", () => {
  it("為小於 40rem 的視窗提供可捲動主頁、緊湊品牌列與清楚的內容節奏", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain(".home-device-theme { height: auto; min-height: 100svh; overflow-y: auto");
    expect(css).toContain(".home-device-main { flex: none; justify-content: flex-start; padding-top: 0.85rem");
    expect(css).toContain(".home-device-brand-logo { width: 2.9rem !important; height: 2.9rem !important; }");
    expect(css).toContain(".home-device-panel { border-radius: 1rem; padding: 1rem; }");
  });

  it("以較高選擇器優先序讓手機版主內容依內容延展，避免 flex-1 壓縮造成標頭、卡片與頁尾重疊", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("@media (max-width: 47.999rem)");
    expect(css).toContain(".home-device-theme.home-device-runtime { height: auto !important; min-height: 100svh; overflow-x: clip !important; overflow-y: visible !important; }");
    expect(css).toContain(".home-device-theme.home-device-runtime .home-device-main { flex: 0 0 auto !important; min-height: 0; justify-content: flex-start !important;");
    expect(css).toContain(".home-device-theme.home-device-runtime .home-device-main > .grid { width: 100%; min-width: 0; gap: 2.15rem !important; }");
    expect(css).toContain(".home-device-theme.home-device-runtime .home-device-footer { flex: 0 0 auto !important; min-width: 0; }");
    expect(css).toContain(".home-device-runtime.is-ready .home-device-brand-lockup, .home-device-runtime.is-ready .home-device-status");
    expect(css).toContain("animation: none !important; opacity: 1 !important; transform: none !important;");
  });

  it("維持手機版純向量標誌、錄製裝飾、整理後角標與第6屆兩側短線的縮放規則", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain(".home-reference-stage { width: min(100%, 24rem); padding: 0.85rem 3.15rem 2.2rem;");
    expect(css).toContain(".home-reference-title { gap: 0.5rem; }");
    expect(css).toContain(".home-reference-rec { top: 1.2rem; left: 1.15rem");
    expect(css).toContain(".home-reference-battery { top: 1.16rem; right: 1.15rem");
    expect(css).toContain(".home-reference-corner--top-left { left: 0.8rem; }");
    expect(css).not.toContain(".home-reference-mic");
    expect(css).toContain(".home-reference-edition-row { gap: 0.32rem; margin-top: 0.26rem; }");
    expect(css).toContain(".home-reference-edition-accent { gap: 0.16rem; width: clamp(1.55rem, 8vw, 2.25rem); }");
  });

  it("為 320px 寬度提供更緊湊的專屬斷點，避免窄螢幕元素跑版", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("@media (max-width: 20rem)");
    expect(css).toContain(".home-reference-stage { width: 100%; padding: 0.65rem 2.6rem 1.85rem; }");
    expect(css).toContain(".home-reference-title { gap: 0.36rem; }");
    expect(css).toContain(".home-device-main { padding-inline: 1rem; padding-top: 0.55rem; padding-bottom: 2rem; }");
    expect(css).toContain(".home-device-card-description { font-size: 0.64rem; letter-spacing: -0.04em; line-height: 1.45; white-space: nowrap; }");
    expect(css).toContain(".home-device-theme.home-device-runtime .home-device-card-description { white-space: normal !important; }");
  });

  it("首頁頁尾僅顯示清水高中媒體服務隊的版權名稱", () => {
    const page = readFileSync("client/src/pages/Home.tsx", "utf8");

    expect(page).toContain("2026 清水高中媒體服務隊");
    expect(page).not.toContain("2026 清水高中媒體服務隊管理系統");
  });
});
