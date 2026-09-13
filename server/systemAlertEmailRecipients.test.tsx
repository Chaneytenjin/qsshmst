// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SystemAlertEmailRecipients from "../client/src/pages/SystemAlertEmailRecipients";

const mocks = vi.hoisted(() => ({
  listUseQuery: vi.fn(),
  invalidate: vi.fn(),
  createRecipientMutate: vi.fn(),
  setRecipientActiveMutate: vi.fn(),
  deleteRecipientMutate: vi.fn(),
  sendTestMutate: vi.fn(),
}));

const mutationState = (mutate: ReturnType<typeof vi.fn>) => ({
  mutate,
  isPending: false,
});

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      systemAlertEmail: { list: { invalidate: mocks.invalidate } },
    }),
    systemAlertEmail: {
      list: { useQuery: mocks.listUseQuery },
      createRecipient: { useMutation: () => mutationState(mocks.createRecipientMutate) },
      setRecipientActive: { useMutation: () => mutationState(mocks.setRecipientActiveMutate) },
      deleteRecipient: { useMutation: () => mutationState(mocks.deleteRecipientMutate) },
      sendTest: { useMutation: () => mutationState(mocks.sendTestMutate) },
    },
  },
}));

describe("SystemAlertEmailRecipients", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("顯示收件信箱設定、啟用狀態與最近寄送紀錄", () => {
    mocks.listUseQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        recipients: [{
          id: 1,
          email: "team@example.edu.tw",
          label: "媒服行政組",
          isActive: true,
          updatedAt: new Date("2026-08-12T08:00:00.000Z"),
        }],
        deliveries: [{
          id: 1,
          recipientEmail: "team@example.edu.tw",
          subject: "[清水高中媒服系統異常] 系統異常郵件測試",
          status: "sent",
          errorDetail: null,
          createdAt: new Date("2026-08-12T08:05:00.000Z"),
        }],
      },
    });

    render(<SystemAlertEmailRecipients />);

    expect(screen.getByRole("heading", { name: "系統異常郵件通知" })).toBeInTheDocument();
    expect(screen.getByLabelText("電子郵件")).toBeInTheDocument();
    expect(screen.getAllByText("team@example.edu.tw")).toHaveLength(2);
    expect(screen.getByText("媒服行政組")).toBeInTheDocument();
    expect(screen.getByText("啟用")).toBeInTheDocument();
    expect(screen.getByText("最近寄送紀錄")).toBeInTheDocument();
    expect(screen.getByText("已寄出")).toBeInTheDocument();
  });
});
