// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DatabaseMaintenance from "../client/src/pages/DatabaseMaintenance";

const mocks = vi.hoisted(() => ({
  deactivate: vi.fn(),
  runCheck: vi.fn(),
  cleanupTestAccounts: vi.fn(),
  refetch: vi.fn().mockResolvedValue(undefined),
  user: { id: 1, isFounder: true },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../client/src/components/AuditPinDialog", () => ({ AuditPinDialog: () => null }));
vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auditPin: { verify: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    users: {
      deduplicationStatus: {
        useQuery: () => ({
          isLoading: false,
          error: null,
          refetch: mocks.refetch,
          data: {
            schedule: { id: 1, isActive: true, lastRunAt: null },
            latestReport: {
              id: 1,
              duplicateGroupCount: 1,
              createdAt: new Date("2026-08-12T03:00:00.000Z"),
              groups: [{
                field: "email",
                value: "duplicate@example.com",
                users: [
                  { id: 9, username: "duplicate-user", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false },
                  { id: 10, username: "duplicate-user-2", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false },
                ],
              }],
            },
            testAccounts: [{ id: 31, username: "ui_test_1786514682037", name: "UI Test User", role: "student", isActive: true, createdAt: new Date("2026-08-12T03:00:00.000Z") }],
          },
        }),
      },
      runDeduplicationCheck: { useMutation: () => ({ mutate: mocks.runCheck, isPending: false }) },
      deactivateDuplicateUser: { useMutation: () => ({ mutate: mocks.deactivate, isPending: false }) },
      cleanupTestAccounts: { useMutation: () => ({ mutate: mocks.cleanupTestAccounts, isPending: false }) },
    },
  },
}));

describe("DatabaseMaintenance", () => {
  beforeEach(() => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    mocks.user = { id: 1, isFounder: true };
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("呈現每日報告設定與逐筆停用確認，且不會提供自動清理操作", () => {
    render(<DatabaseMaintenance />);

    expect(screen.getByRole("heading", { name: "資料庫維護" })).toBeInTheDocument();
    expect(screen.getByText("每日台灣時間凌晨 03:00")).toBeInTheDocument();
    expect(screen.getByText("duplicate@example.com")).toBeInTheDocument();
    expect(screen.getByText(/絕不自動刪除或停用帳號/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "停用帳號" })[0]);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("確認停用重複帳號？");
    fireEvent.click(screen.getByRole("button", { name: "確認停用帳號" }));
    expect(mocks.deactivate).toHaveBeenCalledWith({ id: 9 });
  });

  it("拒絕非創始管理員存取資料庫維護控制", () => {
    mocks.user = { id: 2, isFounder: false };
    render(<DatabaseMaintenance />);
    expect(screen.getByText("僅創始管理員可以執行帳號去重維護")).toBeInTheDocument();
  });

  it("測試帳號快速清理需要輸入固定確認字串後才會呼叫永久清理程序", () => {
    render(<DatabaseMaintenance />);

    fireEvent.click(screen.getByRole("button", { name: "清理測試帳號" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("永久清理 1 個測試帳號？");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("ui_test_1786514682037");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("即將永久刪除的帳號（1）");
    const confirmButton = screen.getByRole("button", { name: "永久清理測試帳號" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("DELETE TEST ACCOUNTS"), { target: { value: "DELETE TEST ACCOUNTS" } });
    fireEvent.click(confirmButton);
    expect(mocks.cleanupTestAccounts).toHaveBeenCalledWith({ confirmation: "DELETE TEST ACCOUNTS" });
  });
});
