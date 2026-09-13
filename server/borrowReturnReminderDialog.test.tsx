// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    borrowRecords: {
      unreadReminders: { useQuery: mocks.useQuery },
      markRemindersRead: { useMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

import { BorrowReturnReminderDialog } from "../client/src/components/BorrowReturnReminderDialog";

describe("BorrowReturnReminderDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refetch.mockResolvedValue(undefined);
    mocks.mutateAsync.mockResolvedValue({ success: true });
  });

  it("呈現逾期與明日到期器材，並確認後標記所有提醒為已讀", async () => {
    mocks.useQuery.mockReturnValue({
      data: [
        { id: 4, equipmentName: "Sony A7 相機", reminderType: "overdue", expectedReturnAt: new Date("2026-08-12T03:00:00.000Z") },
        { id: 5, equipmentName: "無線麥克風", reminderType: "due_soon", expectedReturnAt: new Date("2026-08-14T03:00:00.000Z") },
      ],
      refetch: mocks.refetch,
    });

    render(<BorrowReturnReminderDialog />);
    const dialog = screen.getByTestId("borrow-return-reminder-dialog");
    expect(dialog).toHaveTextContent("器材逾期歸還提醒");
    expect(dialog).toHaveTextContent("Sony A7 相機");
    expect(dialog).toHaveTextContent("無線麥克風");
    expect(dialog).toHaveTextContent("已逾期");
    expect(dialog).toHaveTextContent("明日到期");

    fireEvent.click(screen.getByRole("button", { name: "我已了解" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ ids: [4, 5] }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("已確認器材歸還提醒");
  });

  it("沒有未讀提醒時不開啟對話框", () => {
    mocks.useQuery.mockReturnValue({ data: [], refetch: mocks.refetch });
    render(<BorrowReturnReminderDialog />);
    expect(screen.queryByTestId("borrow-return-reminder-dialog")).not.toBeInTheDocument();
  });
});
