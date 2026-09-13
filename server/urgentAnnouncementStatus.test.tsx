// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import UrgentAnnouncementStatus from "../client/src/pages/UrgentAnnouncementStatus";

const mocks = vi.hoisted(() => ({
  audiences: [] as any[],
  retention: null as any,
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    systemReports: { unreadUrgentRecipients: { useQuery: () => ({ data: mocks.audiences, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) } },
    operationLogs: { retentionStatus: { useQuery: () => ({ data: mocks.retention, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) } },
  },
}));

describe("緊急公告追蹤頁面", () => {
  afterEach(() => {
    cleanup();
    mocks.audiences = [];
    mocks.retention = null;
  });

  it("顯示未讀緊急公告使用者及 365 天日誌保留執行狀態", () => {
    mocks.audiences = [{
      id: 91,
      title: "緊急疏散通知",
      publishedAt: new Date("2026-08-13T00:00:00.000Z"),
      mustReadBy: new Date("2026-08-14T00:00:00.000Z"),
      unreadCount: 2,
      unreadUsers: [{ id: 3, username: "student-a", name: "學生甲", realName: null, role: "student", department: "媒體服務隊" }, { id: 4, username: "teacher-b", name: null, realName: "教師乙", role: "teacher", department: "教務處" }],
    }];
    mocks.retention = {
      schedule: { retentionDays: 365, isActive: true, lastRunAt: new Date("2026-08-13T19:30:00.000Z") },
      latestRun: { deletedCount: 14, cutoffAt: new Date("2025-08-13T19:30:00.000Z"), ranAt: new Date("2026-08-13T19:30:00.000Z") },
    };
    render(<UrgentAnnouncementStatus />);

    expect(screen.getByLabelText("緊急公告未讀名單")).toHaveTextContent("緊急疏散通知");
    expect(screen.getByText("student-a")).toBeInTheDocument();
    expect(screen.getByText("教師乙")).toBeInTheDocument();
    expect(screen.getByLabelText("操作日誌保留政策")).toHaveTextContent("365 天");
    expect(screen.getByLabelText("操作日誌保留政策")).toHaveTextContent("每日 03:00（臺灣時間）");
    expect(screen.getByText("14 筆")).toBeInTheDocument();
  });

  it("可依關鍵字、部門及期限條件篩選未讀使用者", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mocks.audiences = [{
      id: 92,
      title: "緊急器材盤點",
      publishedAt: new Date(),
      mustReadBy: tomorrow,
      unreadCount: 2,
      unreadUsers: [{ id: 3, username: "student-a", name: "學生甲", realName: null, role: "student", department: "媒體服務隊" }, { id: 4, username: "teacher-b", name: null, realName: "教師乙", role: "teacher", department: "教務處" }],
    }];
    render(<UrgentAnnouncementStatus />);

    fireEvent.change(screen.getByPlaceholderText("搜尋未讀者"), { target: { value: "學生甲" } });
    expect(screen.getByText("student-a")).toBeInTheDocument();
    expect(screen.queryByText("teacher-b")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("搜尋未讀者"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("全部部門"), { target: { value: "教務處" } });
    expect(screen.getByText("teacher-b")).toBeInTheDocument();
    expect(screen.queryByText("student-a")).not.toBeInTheDocument();
  });
});
