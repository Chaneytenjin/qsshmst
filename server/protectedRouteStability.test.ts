import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("受保護路由的工作階段穩定性", () => {
  it("對認證查詢的暫時性失敗重試一次，且不會直接導頁", () => {
    const authHook = readFileSync("client/src/_core/hooks/useAuth.ts", "utf8");

    expect(authHook).toContain("retry: 1,");
    expect(authHook).toContain("retryDelay: 500,");
    expect(authHook).toContain("if (meQuery.isPending || logoutMutation.isPending || meQuery.isError) return;");
  });

  it("在登入狀態暫時無法確認時保留目前頁面，僅確認未登入後才於 effect 中導向登入頁", () => {
    const app = readFileSync("client/src/App.tsx", "utf8");

    expect(app).toContain("function RedirectToLogin()");
    expect(app).toContain('window.location.href = "/login";');
    expect(app).toContain("if (!user && error)");
    expect(app).toContain("登入狀態暫時無法確認");
    expect(app).toContain("系統會保留您目前的頁面，不會自動返回首頁");
    expect(app).not.toContain("window.location.href = '/login';");
  });
});
