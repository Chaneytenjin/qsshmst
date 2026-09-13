// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SystemReportNotification } from "../client/src/components/SystemReportNotification";

const mocks = vi.hoisted(() => ({
  inbox: [] as any[],
  markRead: vi.fn(),
  trackDownload: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ systemReports: { inbox: { invalidate: mocks.invalidate }, unread: { invalidate: mocks.invalidate }, statistics: { invalidate: mocks.invalidate } } }),
    systemReports: {
      inbox: { useQuery: () => ({ data: mocks.inbox, isLoading: false, error: null, refetch: mocks.refetch }) },
      markRead: { useMutation: () => ({ mutate: mocks.markRead, isPending: false }) },
      trackDownload: { useMutation: () => ({ mutate: mocks.trackDownload, isPending: false }) },
    },
  },
}));

describe("SystemReportNotification", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.inbox = [];
  });

  it("在側邊欄顯示未讀與緊急計數，並可查看含必讀截止的公告內容", () => {
    mocks.inbox = [
      { id: 16, title: "緊急疏散通知", content: "請立即前往操場集合", status: "published", priority: "urgent", isPinned: true, isRead: false, publishedAt: new Date("2026-08-14T08:00:00.000Z"), mustReadBy: new Date("2026-08-15T08:00:00.000Z"), assets: [] },
      { id: 17, title: "例行維護", content: "系統將於週末維護", status: "published", priority: "normal", isPinned: false, isRead: true, publishedAt: new Date("2026-08-13T08:00:00.000Z"), mustReadBy: null, assets: [] },
    ];
    render(<SystemReportNotification />);

    expect(screen.getByRole("button", { name: /公告通知，共 1 則未讀，其中 1 則緊急/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /公告通知，共 1 則未讀/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("緊急疏散通知");
    expect(screen.getByRole("dialog")).toHaveTextContent("例行維護");
    expect(screen.getByText("必讀截止：", { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByText("緊急疏散通知"));
    expect(screen.getByRole("dialog")).toHaveTextContent("緊急必讀截止");
    fireEvent.click(screen.getByRole("button", { name: "確認已閱讀" }));
    expect(mocks.markRead).toHaveBeenCalledWith({ id: 16 });
  });

  it("在收合側邊欄保留可存取的公告通知按鈕與未讀數量", () => {
    mocks.inbox = [{ id: 20, title: "公告", content: "內容", status: "published", priority: "important", isPinned: false, isRead: false, publishedAt: new Date(), mustReadBy: null, assets: [] }];
    render(<SystemReportNotification collapsed />);

    expect(screen.getByRole("button", { name: /公告通知，共 1 則未讀/ })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
