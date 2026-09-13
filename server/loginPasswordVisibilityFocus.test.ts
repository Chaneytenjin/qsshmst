import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("登入密碼小眼睛焦點顯示", () => {
  it("非操作狀態隱藏小眼睛，欄位或按鈕取得焦點時才顯示", () => {
    const css = readFileSync("client/src/index.css", "utf8");

    expect(css).toContain(".login-password-visibility-toggle { position: absolute");
    expect(css).toContain("border: 0; border-radius: 999px; background: transparent; box-shadow: none");
    expect(css).toContain("opacity: 0; pointer-events: none; transform: translateX(0.28rem) scale(0.94)");
    expect(css).toContain(".login-tech-field:focus-within .login-password-visibility-toggle, .login-tech-field--visibility-control-active .login-password-visibility-toggle, .login-password-visibility-toggle:focus-visible { opacity: 1; pointer-events: auto; transform: translateX(0) scale(1); }");
  });

  it("保留可鍵盤觸發的小眼睛控制與清楚焦點外框", () => {
    const loginPage = readFileSync("client/src/pages/Login.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(loginPage).toContain('className="login-password-visibility-toggle"');
    expect(loginPage).toContain("aria-pressed={isPasswordVisible}");
    expect(loginPage).toContain("isPasswordVisibilityControlActive");
    expect(loginPage).toContain("onPointerDown={() => setIsPasswordVisibilityControlActive(true)}");
    expect(loginPage).toContain("onClick={() => { setIsPasswordVisibilityControlActive(true); setIsPasswordVisible((visible) => !visible); }}");
    expect(loginPage).not.toContain("請輸入先前安全保存的 12 碼恢復碼每組恢復碼只能使用一次");
    expect(css).toContain(".login-password-visibility-toggle:focus-visible { outline: 2px solid");
    expect(css).toContain("html:not(.dark) .login-password-visibility-toggle { border: 0 !important; background: transparent !important;");
  });
});
