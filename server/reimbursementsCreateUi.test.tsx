// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Reimbursements from "../client/src/pages/Reimbursements";

const mocks = vi.hoisted(() => ({
  createClaim: vi.fn(),
  uploadReceipt: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 2, username: "tata", name: "Tata", role: "student" } }),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ reimbursements: { myList: { invalidate: mocks.invalidate }, list: { invalidate: mocks.invalidate } } }),
    reimbursements: {
      myList: { useQuery: () => ({ data: [], isLoading: false }) },
      list: { useQuery: () => ({ data: [], isLoading: false }) },
      create: { useMutation: () => ({ mutateAsync: mocks.createClaim, isPending: false }) },
      uploadReceipt: { useMutation: () => ({ mutateAsync: mocks.uploadReceipt, isPending: false }) },
      removeReceipt: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      submit: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      review: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      markPaid: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      directPublishAndPay: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      recordPdfExport: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("../client/src/lib/reimbursementPdf", () => ({ exportReimbursementToPdf: vi.fn(), printReimbursement: vi.fn() }));

describe("Reimbursements 草稿建立", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("儲存草稿按鈕會建立報帳、刷新清單並關閉建立對話框", async () => {
    mocks.createClaim.mockResolvedValue({ success: true, id: 81, claimNumber: "RB20260815-1234" });
    mocks.invalidate.mockResolvedValue(undefined);
    render(<Reimbursements />);

    fireEvent.click(screen.getByRole("button", { name: "新增報帳" }));
    expect(screen.getByRole("dialog")).toHaveClass("reimbursement-create-dialog", "max-w-5xl");
    expect(screen.getByRole("dialog")).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(screen.getByRole("dialog").querySelector(".reimbursement-create-dialog-scroll")).toHaveClass("overflow-y-auto");
    fireEvent.change(screen.getByLabelText("報帳名稱"), { target: { value: "器材耗材" } });
    fireEvent.change(screen.getByPlaceholderText("支出內容"), { target: { value: "更換麥克風線材" } });
    fireEvent.change(screen.getByPlaceholderText("金額"), { target: { value: "480" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存草稿" }));

    await waitFor(() => expect(mocks.createClaim).toHaveBeenCalledWith(expect.objectContaining({
      title: "器材耗材",
      items: [expect.objectContaining({ category: "耗材", description: "更換麥克風線材", amount: 480, expenseDate: expect.any(Date) })],
    })));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("建立報帳草稿")).not.toBeInTheDocument());
  });
});
