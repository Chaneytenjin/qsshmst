// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import SystemReports from "../client/src/pages/SystemReports";
import SystemReportStatistics from "../client/src/pages/SystemReportStatistics";
import SystemReportCreated from "../client/src/pages/SystemReportCreated";
import { SystemReportDialog } from "../client/src/components/SystemReportDialog";

const mocks = vi.hoisted(() => ({
  user: { id: 1, role: "teacher" } as { id: number; role: "admin" | "teacher" | "student" },
  listData: [] as any[],
  unreadData: [] as any[],
  statisticsData: [] as any[],
  createMutate: vi.fn(),
  createMutateAsync: vi.fn().mockResolvedValue({ id: 17, status: "published" }),
  updateMutate: vi.fn(),
  updateMutateAsync: vi.fn().mockResolvedValue({ success: true }),
  publishMutate: vi.fn(),
  publishMutateAsync: vi.fn().mockResolvedValue({ success: true }),
  uploadMutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
  removeMutateAsync: vi.fn().mockResolvedValue({ success: true }),
  markReadMutate: vi.fn(),
  setPinnedMutateAsync: vi.fn().mockResolvedValue({ success: true }),
  setPriorityMutateAsync: vi.fn().mockResolvedValue({ success: true }),
  trackDownloadMutate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ systemReports: { list: { invalidate: mocks.invalidate }, unread: { invalidate: mocks.invalidate }, inbox: { invalidate: mocks.invalidate }, statistics: { invalidate: mocks.invalidate } } }),
    systemReports: {
      list: { useQuery: () => ({ data: mocks.listData, isLoading: false, error: null, refetch: vi.fn() }) },
      unread: { useQuery: () => ({ data: mocks.unreadData, isLoading: false, error: null }) },
      statistics: { useQuery: () => ({ data: mocks.statisticsData, isLoading: false, error: null, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutate: mocks.createMutate, mutateAsync: mocks.createMutateAsync, isPending: false }) },
      updateDraft: { useMutation: () => ({ mutate: mocks.updateMutate, mutateAsync: mocks.updateMutateAsync, isPending: false }) },
      publish: { useMutation: () => ({ mutate: mocks.publishMutate, mutateAsync: mocks.publishMutateAsync, isPending: false }) },
      uploadAsset: { useMutation: () => ({ mutateAsync: mocks.uploadMutateAsync, isPending: false }) },
      removeAsset: { useMutation: () => ({ mutateAsync: mocks.removeMutateAsync, isPending: false }) },
      setPinned: { useMutation: () => ({ mutateAsync: mocks.setPinnedMutateAsync, isPending: false }) },
      setPriority: { useMutation: () => ({ mutateAsync: mocks.setPriorityMutateAsync, isPending: false }) },
      trackDownload: { useMutation: () => ({ mutate: mocks.trackDownloadMutate, isPending: false }) },
      markRead: { useMutation: () => ({ mutate: mocks.markReadMutate, isPending: false }) },
    },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("系統報告介面", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.user = { id: 1, role: "teacher" };
    mocks.listData = [];
    mocks.unreadData = [];
    mocks.statisticsData = [];
    mocks.createMutateAsync.mockResolvedValue({ id: 17, status: "published" });
  });

  it("教師可設定永久顯示並直接發布系統報告", async () => {
    render(<SystemReports />);

    fireEvent.change(screen.getByLabelText("報告標題"), { target: { value: "系統維護通知" } });
    fireEvent.change(screen.getByLabelText("報告內容"), { target: { value: "今晚將進行例行維護" } });
    expect(screen.getByLabelText("新增報告圖片")).toBeInTheDocument();
    expect(screen.getByLabelText("新增報告附件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "直接發布" }));

    await waitFor(() => expect(mocks.createMutateAsync).toHaveBeenCalledWith({
      title: "系統維護通知",
      content: "今晚將進行例行維護",
      expiresAt: null,
      publishNow: true,
      isPinned: false,
      priority: "normal",
      mustReadBy: null,
    }));
  });

  it("教師可選擇有效期限並將其提交至草稿流程", async () => {
    render(<SystemReports />);
    fireEvent.change(screen.getByLabelText("報告標題"), { target: { value: "限時公告" } });
    fireEvent.change(screen.getByLabelText("報告內容"), { target: { value: "請在期限前閱讀" } });
    fireEvent.click(screen.getByLabelText(/指定時間後自動下架/));
    fireEvent.change(screen.getByLabelText("有效至"), { target: { value: "2027-01-01T12:00" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存草稿" }));

    await waitFor(() => expect(mocks.createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      publishNow: false,
      expiresAt: expect.any(Date),
    })));
  });

  it("教師可為系統報告設定置頂及緊急重要程度", async () => {
    render(<SystemReports />);
    fireEvent.change(screen.getByLabelText("報告標題"), { target: { value: "緊急維護公告" } });
    fireEvent.change(screen.getByLabelText("報告內容"), { target: { value: "請立即確認" } });
    fireEvent.click(screen.getByLabelText("置頂系統報告"));
    fireEvent.change(screen.getByLabelText("系統報告重要程度"), { target: { value: "urgent" } });
    fireEvent.change(screen.getByLabelText("緊急公告必讀截止時間"), { target: { value: "2027-01-01T12:00" } });
    fireEvent.click(screen.getByRole("button", { name: "直接發布" }));

    await waitFor(() => expect(mocks.createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ isPinned: true, priority: "urgent", mustReadBy: expect.any(Date) })));
  });

  it("管理員可查看每篇已發布報告的已讀與未讀人數統計", () => {
    mocks.user = { id: 1, role: "admin" };
    mocks.statisticsData = [{
      id: 12,
      title: "重要公告",
      readCount: 18,
      unreadCount: 4,
      activeUserCount: 22,
      expiresAt: null,
      isPinned: true,
      priority: "important",
      assets: [{ id: 3, assetKind: "attachment", fileName: "maintenance.pdf", downloadCount: 7 }],
      downloadCount: 7,
    }];
    render(<SystemReportStatistics />);

    expect(screen.getByLabelText("系統報告閱讀統計")).toHaveTextContent("重要公告");
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("82% 已讀")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("7 次下載")).toBeInTheDocument();
  });

  it("已建立的報告子頁會顯示草稿並提供編輯入口", () => {
    mocks.user = { id: 1, role: "teacher" };
    mocks.listData = [{
      id: 21,
      title: "草稿報告",
      content: "草稿內容",
      status: "draft",
      updatedAt: new Date("2026-08-12T08:00:00.000Z"),
      publishedAt: null,
      expiresAt: null,
      authorId: 1,
      authorUsername: "teacher",
      authorName: "教師",
      authorRealName: null,
      isPinned: false,
      priority: "normal",
      mustReadBy: null,
      assets: [],
    }];
    render(<SystemReportCreated />);

    expect(screen.getByRole("heading", { name: "已建立的報告", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("草稿報告")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /編輯/ })).toHaveAttribute("href", "/system-reports?edit=21");
  });

  it("登入後會顯示未讀報告的圖片與附件，確認後記錄閱讀狀態", () => {
    mocks.unreadData = [{
      id: 9,
      title: "重要系統公告",
      content: "請所有使用者確認此內容",
      status: "published",
      publishedAt: new Date("2026-08-12T08:00:00.000Z"),
      expiresAt: new Date("2027-08-20T08:00:00.000Z"),
      authorUsername: "admin",
      authorName: "管理員",
      authorRealName: null,
      isPinned: true,
      priority: "urgent",
      mustReadBy: new Date("2027-08-18T08:00:00.000Z"),
      assets: [
        { id: 1, assetKind: "image", fileName: "maintenance.png", url: "/manus-storage/report-image.png" },
        { id: 2, assetKind: "attachment", fileName: "maintenance.pdf", url: "/manus-storage/report.pdf" },
      ],
    }];
    render(<SystemReportDialog />);

    expect(screen.getByRole("dialog")).toHaveTextContent("重要系統公告");
    expect(screen.getByRole("img", { name: "maintenance.png" })).toHaveAttribute("src", "/manus-storage/report-image.png");
    expect(screen.getByRole("link", { name: /maintenance.pdf/ })).toHaveAttribute("href", "/manus-storage/report.pdf");
    expect(screen.getByText("置頂公告")).toBeInTheDocument();
    expect(screen.getByText("緊急")).toBeInTheDocument();
    expect(screen.getByText("緊急必讀提醒")).toBeInTheDocument();
    expect(screen.getByText(/每次登入後再次提醒/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /maintenance.pdf/ }));
    expect(mocks.trackDownloadMutate).toHaveBeenCalledWith({ assetId: 2 });
    expect(screen.getByText(/有效至/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "我已閱讀" }));

    expect(mocks.markReadMutate).toHaveBeenCalledWith({ id: 9 });
  });
});
