// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppLayout } from "../client/src/components/AppLayout";

const mocks = vi.hoisted(() => ({
  user: { id: 1, name: "創始管理員", role: "admin", isFounder: true },
  logout: vi.fn(),
  logoutUseMutation: vi.fn(),
  verifyPinUseMutation: vi.fn(),
  brandLogoReportUseMutation: vi.fn(),
  unreadBorrowReminders: vi.fn(),
  markBorrowRemindersRead: vi.fn(),
  refetchBorrowReminders: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auth: { logout: { useMutation: mocks.logoutUseMutation } },
    systemMaintenance: { status: { useQuery: () => ({ data: { systemMode: "online", maintenanceMode: false, updatedAt: null }, isLoading: false, error: null }) } },
    auditPin: { verify: { useMutation: mocks.verifyPinUseMutation } },
    brandLogoMonitoring: { reportFailure: { useMutation: mocks.brandLogoReportUseMutation } },
    borrowRecords: {
      unreadReminders: { useQuery: () => ({ data: [], isLoading: false, error: null, refetch: mocks.refetchBorrowReminders }) },
      markRemindersRead: { useMutation: () => ({ mutateAsync: mocks.markBorrowRemindersRead, isPending: false }) },
    },
    reimbursements: {
      unreadNotifications: { useQuery: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }) },
      markNotificationsRead: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, logout: mocks.logout }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactElement }) => React.cloneElement(children as React.ReactElement<any>, { href }),
  useLocation: () => ["/dashboard", mocks.setLocation],
}));

vi.mock("../client/src/components/StatusBadge", () => ({
  RoleBadge: ({ role }: { role: string }) => <span>{role}</span>,
}));

vi.mock("../client/src/components/AuditPinDialog", () => ({
  AuditPinDialog: ({ open }: { open: boolean }) => <div data-testid="audit-pin-dialog" data-open={String(open)} />,
}));
vi.mock("../client/src/components/SystemReportDialog", () => ({ SystemReportDialog: () => null }));
vi.mock("../client/src/components/SystemReportNotification", () => ({ SystemReportNotification: () => null }));

describe("系統管理單一入口", () => {
  afterEach(() => {
    cleanup();
    mocks.user = { id: 1, name: "創始管理員", role: "admin", isFounder: true };
    mocks.logoutUseMutation.mockReturnValue({ mutate: vi.fn() });
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.brandLogoReportUseMutation.mockReturnValue({ mutate: vi.fn() });
    vi.clearAllMocks();
  });

  it("創始管理員可進入系統管理總覽，側邊選單不顯示展開控制或次層項目", () => {
    mocks.logoutUseMutation.mockReturnValue({ mutate: vi.fn() });
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.brandLogoReportUseMutation.mockReturnValue({ mutate: vi.fn() });
    render(<AppLayout><div>頁面內容</div></AppLayout>);

    expect(screen.getByText("選單")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "系統管理" })).toHaveAttribute("href", "/system-management");
    expect(screen.queryByRole("button", { name: "展開系統管理子選單" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "管控中心" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("系統異常郵件")).not.toBeInTheDocument();
  });

  it("一般管理員可看到單一系統管理入口，但不顯示次層或創始管理員專屬項目", () => {
    mocks.user = { id: 2, name: "一般管理員", role: "admin", isFounder: false };
    mocks.logoutUseMutation.mockReturnValue({ mutate: vi.fn() });
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.brandLogoReportUseMutation.mockReturnValue({ mutate: vi.fn() });
    render(<AppLayout><div>頁面內容</div></AppLayout>);

    expect(screen.getByRole("link", { name: "系統管理" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展開系統管理子選單" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("緊急公告追蹤")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("帳號管理")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("提醒歷程管理")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "管控中心" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Logo 異常監測")).not.toBeInTheDocument();
  });

  it("教師帳號不顯示系統管理入口，但保留教師可用的主要導覽", () => {
    mocks.user = { id: 3, name: "授課教師", role: "teacher", isFounder: false };
    mocks.logoutUseMutation.mockReturnValue({ mutate: vi.fn() });
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.brandLogoReportUseMutation.mockReturnValue({ mutate: vi.fn() });

    render(<AppLayout><div>頁面內容</div></AppLayout>);

    expect(screen.queryByRole("link", { name: "系統管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展開系統管理子選單" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "器材管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "借用申請審核" })).toBeInTheDocument();
  });
});
