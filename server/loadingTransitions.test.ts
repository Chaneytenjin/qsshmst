import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("首頁與登入頁載入轉場", () => {
  it("公開首頁重新整理時具有短暫滿版初始化動畫，完成後淡出至主要內容", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(home).toContain("const HOME_BOOT_MS = 520;");
    expect(home).toContain("const [isBooting, setIsBooting] = useState(true);");
    expect(home).toContain("setIsBooting(false), prefersReducedMotion ? 0 : HOME_BOOT_MS");
    expect(home).toContain("const LOGIN_ROUTE_TRANSITION_MS = 160;");
    expect(css).toContain("opacity: 0; transform: translateY(0.75rem);");
    expect(css).toContain("inset: 0; display: grid; place-content: center; gap: 1.6rem;");
    expect(css).toContain("pointer-events: none;");
    expect(css).toContain(".home-device-runtime.is-ready .home-device-boot { opacity: 0; visibility: hidden; }");
  });

  it("登入轉場為短暫且非阻塞，不會遮住帳密欄位", () => {
    const login = readFileSync("client/src/pages/Login.tsx", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(login).toContain("const LOGIN_ENTRY_TRANSITION_MS = 160;");
    expect(css).toContain(".login-entry-transition { position: absolute; z-index: 45; top: 1rem;");
    expect(css).toContain("pointer-events: none; text-align: center; }");
    expect(css).toContain(".login-shell--entering .login-console, .login-shell--entering .login-back-control { opacity: 1; transform: none; }");
  });
});
