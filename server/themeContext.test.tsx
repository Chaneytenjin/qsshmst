// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ThemeProvider, useTheme } from "../client/src/contexts/ThemeContext";

function ThemeProbe() {
  const { theme, themeMode, setThemeMode, switchable } = useTheme();
  return (
    <div>
      <p data-testid="resolved-theme">{theme}</p>
      <p data-testid="theme-mode">{themeMode}</p>
      <p data-testid="theme-switchable">{String(switchable)}</p>
      <button type="button" onClick={() => setThemeMode?.("system")}>跟隨系統</button>
      <button type="button" onClick={() => setThemeMode?.("light")}>淺色主題</button>
    </div>
  );
}

describe("ThemeContext 系統主題同步", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("跟隨系統模式會套用目前作業系統設定並在設定變更時同步", () => {
    let matches = true;
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() { return matches; },
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => { changeListener = listener; }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<ThemeProvider defaultTheme="light" switchable><ThemeProbe /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "跟隨系統" }));

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem("theme")).toBe("system");

    matches = false;
    act(() => changeListener?.({ matches: false } as MediaQueryListEvent));
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });

  it("強制跟隨裝置時會停用手動主題控制並保留既有工作階段偏好", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    window.localStorage.setItem("theme", "dark");

    render(<ThemeProvider defaultTheme="dark" switchable forceSystemTheme><ThemeProbe /></ThemeProvider>);

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
    expect(screen.getByTestId("theme-switchable")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "淺色主題" }));
    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("全域樣式包含亮暗模式的高對比文字與資料表規則", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(css).toContain("html:not(.dark) .label-caps");
    expect(css).toContain("html:not(.dark) .data-table td");
    expect(css).toContain("html:not(.dark) .brutalist-card");
    expect(css).toContain("dashboard-theme-scope");
    expect(css).toContain("dashboard-theme-panel--amber");
    expect(css).toContain("chart-tooltip-surface");
    expect(css).toContain("dashboard-chart-viewport");
    expect(css).toContain("reimbursement-category-chart");
    expect(css).toContain("reimbursement-trend-chart");
    expect(css).toContain("color: oklch(0.18 0.07 235)");
    expect(css).toContain("--color-muted-foreground: oklch(0.69 0.02 220)");
  });

  it("彈窗、公告入口與使用者列具有三種可切換主題的共同樣式掛點", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const profileSource = readFileSync(resolve(process.cwd(), "client/src/pages/Profile.tsx"), "utf8");
    const dialogSource = readFileSync(resolve(process.cwd(), "client/src/components/ui/dialog.tsx"), "utf8");
    const alertDialogSource = readFileSync(resolve(process.cwd(), "client/src/components/ui/alert-dialog.tsx"), "utf8");
    const layoutSource = readFileSync(resolve(process.cwd(), "client/src/components/AppLayout.tsx"), "utf8");
    const notificationSource = readFileSync(resolve(process.cwd(), "client/src/components/SystemReportNotification.tsx"), "utf8");

    expect(dialogSource).toContain("dialog-theme-surface");
    expect(alertDialogSource).toContain("alert-dialog-theme-surface");
    expect(layoutSource).toContain("session-sidebar-user-trigger");
    expect(layoutSource).toContain("session-sidebar-user-popover");
    expect(layoutSource).toContain('setThemeMode?.("dark")');
    expect(layoutSource).toContain('setThemeMode?.("light")');
    expect(layoutSource).toContain('setThemeMode?.("system")');
    expect(notificationSource).toContain("session-sidebar-announcement-trigger");
    expect(notificationSource).toContain("system-report-inbox-dialog");
    expect(css).toContain("html:not(.dark) .dialog-theme-surface");
    expect(css).toContain("html:not(.dark) .session-sidebar-announcement-trigger:hover");
    expect(css).toContain("html:not(.dark) .session-sidebar-user-name");
    expect(css).toContain("session-sidebar-user-popover-mobile");
    expect(css).toContain("session-sidebar-theme-mode.is-active");
    expect(css).toContain("html:not(.dark) .system-report-inbox-card.is-unread");
    expect(appSource).toContain('<ThemeProvider defaultTheme="dark" switchable>');
    expect(layoutSource).toContain('aria-label="淺色主題"');
    expect(layoutSource).toContain('aria-label="深色主題"');
    expect(layoutSource).toContain('aria-label="跟隨系統主題"');
    expect(layoutSource.indexOf('aria-label="淺色主題"')).toBeLessThan(layoutSource.indexOf('aria-label="深色主題"'));
    expect(layoutSource.indexOf('aria-label="深色主題"')).toBeLessThan(layoutSource.indexOf('aria-label="跟隨系統主題"'));
    expect(profileSource).not.toContain('<SelectItem value="light">淺色</SelectItem>');
    expect(profileSource).not.toContain('<SelectItem value="dark">深色</SelectItem>');
    expect(profileSource).not.toContain('<SelectItem value="system">自動跟隨系統</SelectItem>');
    expect(homeSource).toContain("home-device-theme");
    expect(homeSource).toContain("home-device-action-row");
    expect(homeSource).not.toContain("以掃描借還與追溯異動紀錄，讓每一件媒體器材都在清晰的流程中管理");
    expect(homeSource).toContain("home-device-card-description");
    expect(homeSource).toContain("home-device-main");
    expect(homeSource).toContain("home-device-brand-lockup");
    expect(css).toContain("html:not(.dark) .home-device-theme");
    expect(css).toContain("html:not(.dark) .home-device-description");
    expect(css).toContain("html[data-public-theme-transition=\"true\"] .login-shell");
    expect(css).toContain("public-theme-surface-fade");
    expect(css).toContain("overscroll-behavior-x: none");
    expect(css).toContain(".home-device-theme { height: 100dvh; overflow: hidden; }");
    expect(css).toContain("padding-top: clamp(4.75rem, 10vh, 7.5rem)");
    expect(css).toContain("#root { width: 100%; min-height: 100%; background: var(--color-background); }");
    expect(css).toContain(".home-device-brand-lockup { transform: translateY(0.45rem); }");
    expect(readFileSync(resolve(process.cwd(), "client/src/contexts/ThemeContext.tsx"), "utf8")).toContain("root.dataset.publicThemeTransition = \"true\"");
  });
});
