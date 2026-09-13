import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexSource = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

function getMetaContent(name: "description" | "keywords") {
  const match = indexSource.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]+)"`));
  return match?.[1] ?? "";
}

describe("首頁 SEO 中繼資料", () => {
  it("提供 3 至 8 個聚焦的 meta keywords", () => {
    const keywords = getMetaContent("keywords").split(",").map((keyword) => keyword.trim()).filter(Boolean);

    expect(keywords).toHaveLength(6);
    expect(keywords.length).toBeGreaterThanOrEqual(3);
    expect(keywords.length).toBeLessThanOrEqual(8);
  });

  it("提供 50 至 160 個字元的 meta description", () => {
    const description = getMetaContent("description");

    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("保留 30 至 60 個字元的首頁 title 中繼資料", () => {
    const title = indexSource.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";

    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("為瀏覽器捷徑與安裝式網站設定清水高中媒體服務隊名稱", () => {
    expect(indexSource).toContain('<meta name="application-name" content="清水高中媒體服務隊管理系統"');
    expect(indexSource).toContain('<meta name="apple-mobile-web-app-title" content="清水高中媒體服務隊管理系統"');
    expect(indexSource).toContain('<link rel="manifest" href="/manifest.webmanifest"');
  });

  it("不額外插入會改變原本主視覺版面的 SEO 標題", () => {
    expect(homeSource).not.toContain("home-seo-heading");
  });
});
