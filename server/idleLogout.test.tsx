// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppLayout } from "../client/src/components/AppLayout";

const mocks = vi.hoisted(() => ({
  logoutMutate: vi.fn(),
  verifyPinMutateAsync: vi.fn(),
  setLocation: vi.fn(),
  systemStatusUseQuery: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auth: { logout: { useMutation: () => ({ mutate: mocks.logoutMutate, isPending: false }) } },
    systemMaintenance: { status: { useQuery: mocks.systemStatusUseQuery } },
    auditPin: { verify: { useMutation: () => ({ mutateAsync: mocks.verifyPinMutateAsync, isPending: false }) } },
    brandLogoMonitoring: { reportFailure: { useMutation: () => ({ mutate: vi.fn() }) } },
    borrowRecords: {
      unreadReminders: { useQuery: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }) },
      markRemindersRead: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    reimbursements: {
      unreadNotifications: { useQuery: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }) },
      markNotificationsRead: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, name: "測試使用者", role: "admin", isFounder: false } }) }));
vi.mock("../client/src/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</>, useLocation: () => ["/dashboard", mocks.setLocation] }));
vi.mock("../client/src/components/BrandLogo", () => ({ BrandLogo: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));
vi.mock("../client/src/components/AuditPinDialog", () => ({ AuditPinDialog: () => null }));
vi.mock("../client/src/components/SystemReportDialog", () => ({ SystemReportDialog: () => null }));
vi.mock("../client/src/components/SystemReportNotification", () => ({ SystemReportNotification: () => null }));
vi.mock("../client/src/components/BorrowReturnReminderDialog", () => ({ BorrowReturnReminderDialog: () => null }));
vi.mock("../client/src/components/StatusBadge", () => ({ RoleBadge: () => null }));

describe("工作階段閒置自動登出", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.logoutMutate.mockReset();
    mocks.systemStatusUseQuery.mockReturnValue({ data: { systemMode: "online", maintenanceMode: false, updatedAt: null }, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("閒置滿三十分鐘會在背景觸發既有安全登出流程", () => {
    render(<AppLayout><div>工作階段內容</div></AppLayout>);

    act(() => vi.advanceTimersByTime(30 * 60 * 1_000));

    expect(mocks.logoutMutate).toHaveBeenCalledTimes(1);
    expect(mocks.logoutMutate).toHaveBeenCalledWith({ reason: "idle" });
    expect(screen.getByTestId("logout-transition")).toHaveAttribute("data-logout-reason", "idle");
    expect(screen.getByTestId("logout-transition")).toHaveTextContent("閒置逾時，正在安全登出");
  });

  it("背景活動會重設閒置計時，直到最新活動後滿三十分鐘才登出", () => {
    render(<AppLayout><div>工作階段內容</div></AppLayout>);

    act(() => vi.advanceTimersByTime(29 * 60 * 1_000));
    fireEvent.pointerDown(window);
    act(() => vi.advanceTimersByTime(2 * 60 * 1_000));
    expect(mocks.logoutMutate).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(28 * 60 * 1_000));
    expect(mocks.logoutMutate).toHaveBeenCalledTimes(1);
    expect(mocks.logoutMutate).toHaveBeenCalledWith({ reason: "idle" });
  });

  it("任何網頁活動都會先停止舊計時器，再從該活動重新建立三十分鐘背景計時", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    render(<AppLayout><div>工作階段內容</div></AppLayout>);
    const clearCountBeforeActivity = clearTimeoutSpy.mock.calls.length;

    act(() => vi.advanceTimersByTime(29 * 60 * 1_000));
    fireEvent.keyDown(window, { key: "Tab" });
    fireEvent.scroll(window);
    fireEvent.touchStart(window);
    fireEvent.focus(window);
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearCountBeforeActivity);

    act(() => vi.advanceTimersByTime(2 * 60 * 1_000));
    expect(mocks.logoutMutate).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(28 * 60 * 1_000));
    expect(mocks.logoutMutate).toHaveBeenCalledTimes(1);
    expect(mocks.logoutMutate).toHaveBeenCalledWith({ reason: "idle" });
    clearTimeoutSpy.mockRestore();
  });

  it("系統維護或離線狀態會安全登出非創始管理員並顯示原因", () => {
    mocks.systemStatusUseQuery.mockReturnValue({ data: { systemMode: "maintenance", maintenanceMode: true, updatedAt: new Date() }, isLoading: false, error: null });

    render(<AppLayout><div>工作階段內容</div></AppLayout>);

    expect(mocks.logoutMutate).toHaveBeenCalledWith({ reason: "system", systemMode: "maintenance" });
    expect(screen.getByTestId("logout-transition")).toHaveAttribute("data-logout-reason", "system");
    expect(screen.getByTestId("logout-transition")).toHaveAttribute("data-system-mode", "maintenance");
    expect(screen.getByTestId("logout-transition")).toHaveTextContent("系統維護中，正在安全結束工作階段");
  });

  it("在預告期間顯示倒數但不顯示登入入口限定公告，且不會提前登出非創始管理員", () => {
    const scheduledFor = new Date(Date.now() + 10 * 60 * 1_000);
    mocks.systemStatusUseQuery.mockReturnValue({ data: { systemMode: "online", maintenanceMode: false, isScheduled: true, scheduledMode: "maintenance", scheduledFor, announcement: "請先完成目前作業", estimatedRestoredAt: new Date(Date.now() + 30 * 60 * 1_000), updatedAt: new Date() }, isLoading: false, error: null });

    render(<AppLayout><div>工作階段內容</div></AppLayout>);

    const notice = screen.getByTestId("system-mode-notice");
    expect(notice).toHaveAttribute("data-system-mode", "maintenance");
    expect(notice).not.toHaveTextContent("請先完成目前作業");
    expect(notice).toHaveTextContent("即將安全登出");
    expect(mocks.logoutMutate).not.toHaveBeenCalled();
  });
});
