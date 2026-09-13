import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

describe("登入欄位裝飾線", () => {
  it("移除帳號與密碼欄位的內部底線與左側裝飾線", () => {
    const loginFieldRule = styles.match(/\.login-tech-field \{[^}]+\}/)?.[0] ?? "";
    const lightLoginFieldRule = styles.match(/html:not\(\.dark\) \.login-tech-field \{[^}]+\}/)?.[0] ?? "";
    expect(styles).toContain(".login-tech-field::after { display: none; }");
    expect(styles).toContain(".login-tech-field > .login-tech-input.industrial-input");
    expect(styles).toContain("border-inline-start: none !important;");
    expect(loginFieldRule).not.toContain("inset 3px 0");
    expect(lightLoginFieldRule).not.toContain("inset 3px 0");
  });

  it("保留圓滑外框與焦點光暈，讓輸入欄位仍清楚可操作", () => {
    expect(styles).toContain("border-radius: 0.72rem;");
    expect(styles).toContain(".login-tech-field:focus-within");
    expect(styles).toContain(".login-password-visibility-toggle");
  });

  it("在輸入、焦點與自動填入狀態仍持續移除圖示右側分隔線", () => {
    expect(styles).toContain(".login-tech-field > .login-tech-input.industrial-input:focus");
    expect(styles).toContain(".login-tech-field > .login-tech-input.industrial-input:not(:placeholder-shown)");
    expect(styles).toContain(".login-tech-field > .login-tech-input.industrial-input:-webkit-autofill");
    expect(styles).toContain("border-inline-end: none !important;");
  });
});
