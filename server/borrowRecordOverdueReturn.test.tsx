// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BorrowRecords from "../client/src/pages/BorrowRecords";

const mocks = vi.hoisted(() => ({
  records: [{
    id: 94,
    equipmentName: "逾期歸還測試器材",
    borrowerName: "測試借用人",
    quantity: 1,
    borrowedAt: new Date("2026-08-20T00:00:00.000Z"),
    expectedReturnAt: new Date("2026-08-21T15:59:00.000Z"),
    actualReturnAt: new Date("2026-08-21T16:00:00.000Z"),
    status: "returned",
    returnNote: "鏡頭已擦拭並完成外觀檢查，已確認電池、記憶卡與保護蓋均隨器材歸還",
  }],
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ borrowRecords: { list: { invalidate: vi.fn() } }, dashboard: { stats: { invalidate: vi.fn() } } }),
    borrowRecords: {
      list: { useQuery: () => ({ data: mocks.records, isLoading: false }) },
      return: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      syncOverdue: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("借用記錄逾期歸還狀態", () => {
  afterEach(cleanup);

  it("實際歸還時間晚於應還時間時顯示逾期歸還狀態，長備註可開啟完整內容", () => {
    render(<BorrowRecords />);

    expect(screen.getByText("逾期歸還")).toHaveClass("status-overdue_returned");
    expect(screen.getByRole("columnheader", { name: "備註" })).toBeInTheDocument();
    const previewButton = screen.getByRole("button", { name: "查看「逾期歸還測試器材」的完整備註" });
    expect(previewButton).toHaveClass("borrow-record-return-note--preview");
    fireEvent.click(previewButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("鏡頭已擦拭並完成外觀檢查，已確認電池、記憶卡與保護蓋均隨器材歸還");
    expect(screen.getByRole("button", { name: "關閉備註彈窗" })).toBeInTheDocument();
  });
});
