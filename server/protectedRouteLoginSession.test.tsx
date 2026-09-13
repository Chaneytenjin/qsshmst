// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { ProtectedRoute } from "../client/src/App";

const mocks = vi.hoisted(() => ({
  user: {
    id: 2028,
    username: "session-switch-user",
    name: "Session Switch User",
    role: "student",
    isFounder: false,
  } as any,
  loading: false,
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: mocks.loading }),
}));
vi.mock("../client/src/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <main data-testid="protected-layout">{children}</main>,
}));

describe("一般帳號工作階段的受保護路由", () => {
  afterEach(() => cleanup());

  it("登入工作階段水合為一般帳號後會保留在儀表板，而非重新導回登入頁", () => {
    const DashboardProbe = () => <h1>一般帳號儀表板</h1>;

    render(<ProtectedRoute component={DashboardProbe} />);

    expect(screen.getByTestId("protected-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一般帳號儀表板" })).toBeInTheDocument();
  });

  it("仍使用臨時密碼的帳號不可進入受保護頁面", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { href: "" } });
    mocks.user = { ...mocks.user, isTemporaryPassword: true };
    const DashboardProbe = () => <h1>不應顯示的儀表板</h1>;

    render(<ProtectedRoute component={DashboardProbe} />);

    expect(screen.queryByRole("heading", { name: "不應顯示的儀表板" })).not.toBeInTheDocument();
    expect(window.location.href).toBe("/login");
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    mocks.user = { ...mocks.user, isTemporaryPassword: false };
  });
});
