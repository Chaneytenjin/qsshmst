import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const publicDirectory = resolve(projectRoot, "client/public");
const sitemap = readFileSync(resolve(publicDirectory, "sitemap.xml"), "utf8");
const robots = readFileSync(resolve(publicDirectory, "robots.txt"), "utf8");

describe("公開搜尋索引靜態設定", () => {
  it("sitemap 僅收錄正式網域的公開首頁", () => {
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("https://your-domain.example/");
    expect(sitemap.match(/<url>/g)).toHaveLength(1);
    expect(sitemap).not.toContain("/login");
    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).not.toContain("/profile");
    expect(sitemap).not.toContain("/users");
  });

  it("robots 允許公開首頁並排除登入、API、個人資料與受保護管理路由", () => {
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /login");
    expect(robots).toContain("Disallow: /certificate-verify");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /profile");
    expect(robots).toContain("Disallow: /users");
    expect(robots).toContain("Disallow: /system-management");
    expect(robots).toContain("Disallow: /audit-center/");
    expect(robots).toContain("Sitemap: https://your-domain.example/sitemap.xml");
  });
});
