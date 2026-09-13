// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ProtectedAccountSecurity from "../client/src/pages/ProtectedAccountSecurity";

const mocks = vi.hoisted(() => ({
  invalidateOverview: vi.fn(),
  verifyAuditPin: vi.fn(),
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 3570001, username: "Chaney", role: "admin", isFounder: true } }),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ protectedAccountSecurity: { overview: { invalidate: mocks.invalidateOverview } } }),
    auditPin: { verify: { useMutation: () => ({ mutateAsync: mocks.verifyAuditPin, isPending: false }) } },
    protectedAccountSecurity: {
      overview: {
        useQuery: () => ({
          data: {
            account: { id: 3570001, username: "Chaney", name: "Chaney", realName: "Chaney", role: "admin", isActive: true, isFounder: true, hasLoginPin: true, hasAuditPin: true, twoFactorEnabled: true, lastSignedIn: new Date(), passwordChangedAt: new Date(), createdAt: new Date() },
            loginSecurity: { attemptCount: 0, lastAttemptAt: null, lockedUntil: null, isLocked: false, remainingSeconds: 0 },
            loginPinSecurity: { attemptCount: 1, lastAttemptAt: null, lockedUntil: null, isLocked: false, remainingSeconds: 0 },
            auditPinSecurity: { attemptCount: 2, lastAttemptAt: null, lockedUntil: null, isLocked: false, remainingSeconds: 0 },
            loginSummary: { total: 1, successful: 1, failed: 0, lastLoginAt: new Date() },
            protectedOperations: [],
          },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock("../client/src/components/AuditPinDialog", () => ({ AuditPinDialog: () => null }));

describe("創始管理員雙 PIN 唯讀安全摘要", () => {
  beforeEach(() => window.sessionStorage.setItem("qingshui-audit-pin-verified-at", String(Date.now())));
  afterEach(() => { cleanup(); window.sessionStorage.clear(); vi.clearAllMocks(); });

  it("呈現兩組 PIN 的獨立狀態與鎖定狀態，並清楚說明唯一初始設定政策", () => {
    render(<ProtectedAccountSecurity />);

    expect(screen.getAllByText("登入 PIN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("稽核認證 PIN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已完成唯一初始設定")).toHaveLength(2);
    expect(screen.getByText("登入 PIN 鎖定")).toBeInTheDocument();
    expect(screen.getByText("稽核 PIN 鎖定")).toBeInTheDocument();
    expect(screen.getByText(/系統不提供任何設定、重設或變更入口/)).toBeInTheDocument();
  });

  it("不提供任何 PIN 輸入欄位、設定或重設按鈕", () => {
    render(<ProtectedAccountSecurity />);

    expect(screen.queryByLabelText("新的 6 位數 PIN")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("確認新的 PIN")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /設定 PIN|重設 PIN|變更 PIN/ })).not.toBeInTheDocument();
  });
});
