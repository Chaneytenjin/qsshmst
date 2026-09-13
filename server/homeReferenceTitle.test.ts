import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("主頁純文字媒服識別標題", () => {
  it("使用附件藍綠色外框白字主標與白色筆刷藍綠字副標的純文字構圖，不嵌入圖片", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(home).toContain('data-testid="home-reference-title"');
    expect(home).toContain('className="home-reference-title-primary">清水');
    expect(home).toContain('className="home-reference-title-secondary">媒體服務隊');
    expect(home).toContain('className="home-reference-edition">第6屆');
    expect(home).not.toContain("以掃描借還與追溯異動紀錄，讓每一件媒體器材都在清晰的流程中管理");
    expect(home).not.toContain("IMG_0423");
    expect(css).toContain(".home-reference-title-primary");
    expect(css).toContain("#fffdf4");
    expect(css).toContain('font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif');
    expect(css).toContain("--home-reference-accent: #1bacc4");
    expect(css).toContain("-webkit-text-stroke: 0.064em var(--home-reference-accent)");
    expect(css).toContain("color: var(--home-reference-accent)");
    expect(css).toContain("background: #fffdf4");
    expect(css).toContain(".home-reference-title-secondary::before");
    expect(css).toContain('font-size: clamp(4.25rem, 8.5vw, 6.8rem)');
    expect(css).toContain(".home-reference-edition");
  });

  it("保留白色筆刷藍字副標與錄製裝飾，移除左下麥克風並整理引號角標", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");
    const document = readFileSync("client/index.html", "utf8");

    expect(home).toContain('data-testid="home-reference-ornaments"');
    expect(home).not.toContain('className="home-reference-mic"');
    expect(home).toContain('home-reference-corner--top-left');
    expect(home).toContain('home-reference-corner--bottom-right');
    expect(home).toContain('className="home-reference-rec"');
    expect(home).toContain('className="home-reference-battery"');
    expect(home).toContain('className="home-reference-edition-row"');
    expect(home).toContain('className="home-reference-edition-accent home-reference-edition-accent--left"');
    expect(home).toContain('className="home-reference-edition-accent home-reference-edition-accent--right"');
    expect(home).not.toContain("home-reference-accent-lines");
    expect(css).toContain(".home-reference-edition-row");
    expect(css).toContain(".home-reference-edition-accent");
    expect(css).toContain(".home-reference-rec");
    expect(css).toContain(".home-reference-battery");
    expect(css).toContain(".home-reference-corner--top-left");
    expect(css).toContain(".home-reference-corner--bottom-right");
    expect(css).toContain(".home-reference-corner--top-left { top: 0.95rem; left: 1.1rem");
    expect(css).toContain(".home-reference-corner--bottom-right { right: 1.1rem; bottom: 1.12rem");
    expect(css).not.toContain(".home-reference-mic");
    expect(css).toContain(".home-reference-rec { position: absolute; top: 1.5rem; left: 1.65rem");
    expect(css).toContain(".home-reference-battery { position: absolute; top: 1.45rem; right: 1.65rem");
    expect(document).toContain("Noto+Sans+TC:wght@700;900");
    expect(document).not.toContain("family=Iansui");
    expect(document).toContain("Zen+Maru+Gothic:wght@700;900");
  });

  it("保留三層文字與整理後的對稱引號角標留白", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("width: min(100%, 36rem)");
    expect(css).toContain("padding: 1.1rem 4.5rem 2.85rem");
    expect(css).toContain("gap: 0.72rem");
    expect(css).toContain("font-size: clamp(2.32rem, 4.7vw, 3.7rem)");
    expect(css).toContain("letter-spacing: -0.04em");
    expect(css).toContain("line-height: 1.1");
    expect(css).toContain(".home-reference-corner--top-left, .home-reference-corner--top-right { width: 1.18rem; height: 1.72rem; }");
    expect(css).toContain("width: 0.95rem; height: 1.55rem");
  });

  it("以原本粗厚方正字形呈現三層品牌文字，但不過度壓縮字距", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("font-stretch: condensed");
    expect(css).toContain("letter-spacing: -0.135em");
    expect(css).toContain("transform: scaleX(0.92) rotate(-0.7deg)");
    expect(css).toContain("transform: scaleX(0.94) rotate(0.3deg)");
    expect(css).toContain("white-space: nowrap");
  });

  it("提供低對比常駐深藍環境光暈，並在精細指標懸停時僅微幅增亮", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain("transition: filter 180ms var(--ease-out), text-shadow 180ms var(--ease-out)");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain(".home-reference-stage:hover .home-reference-title-primary");
    expect(css).toContain(".home-reference-stage:hover .home-reference-title-secondary");
    expect(css).toContain(".home-reference-stage:hover .home-reference-edition");
    expect(css).toContain(".home-reference-stage::before");
    expect(css).toContain("background: radial-gradient(ellipse at 50% 48%, rgb(16 51 95 / 0.16) 0%, rgb(16 51 95 / 0.07) 52%, transparent 76%)");
    expect(css).toContain("rgb(16 51 95 / 0.18)");
    expect(css).toContain("rgb(16 51 95 / 0.24)");
    expect(css).not.toContain("rgb(27 172 196 / 0.72)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("將系統介紹第一項標示為掃描借還，不再使用舊有 QR 借還節點名稱", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");

    expect(home).toContain('title: "掃描借還"');
    expect(home).toContain('description: "掃描、確認、歸還，一站完成"');
    expect(home).not.toContain("QR 借還節點");
  });
});
