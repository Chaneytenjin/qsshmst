import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const profileSource = readFileSync(resolve(projectRoot, "client/src/pages/Profile.tsx"), "utf8");
const stylesheet = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("登入密碼子頁淺色模式呈現", () => {
  it("移除英文標題編號，並提供具備完整淺色互動狀態的確認按鈕", () => {
    expect(profileSource).toContain(">LOGIN PASSWORD</p>");
    expect(profileSource).not.toContain("01 · LOGIN PASSWORD");
    expect(profileSource).toContain("login-password-security-submit");

    expect(stylesheet).toContain("html:not(.dark) .login-password-security-card .login-password-security-submit {");
    expect(stylesheet).toContain(".login-password-security-submit:hover:not(:disabled)");
    expect(stylesheet).toContain(".login-password-security-submit:focus-visible");
    expect(stylesheet).toContain(".login-password-security-submit:disabled");
  });
});
