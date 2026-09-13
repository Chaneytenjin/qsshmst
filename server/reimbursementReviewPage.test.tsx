// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReimbursementReview from "../client/src/pages/ReimbursementReview";

const mocks = vi.hoisted(() => ({ review: vi.fn(), invalidate: vi.fn() }));

vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 2, username: "teacher", name: "教師", role: "teacher" } }) }));
vi.mock("../client/src/lib/trpc", () => ({ trpc: { useUtils: () => ({ reimbursements: { list: { invalidate: mocks.invalidate }, myList: { invalidate: mocks.invalidate } } }), reimbursements: { list: { useQuery: () => ({ data: [{ id: 81, claimNumber: "RB20260815-1234", title: "活動耗材", purpose: "社團活動使用", totalAmount: "540", requesterId: 8, requesterUsername: "student", requesterName: "學生", requesterRealName: "學生甲", createdAt: new Date("2026-08-15T08:00:00Z"), submittedAt: new Date("2026-08-15T09:00:00Z"), status: "submitted", reviewNote: null, items: [{ id: 1, expenseDate: new Date("2026-08-12T00:00:00Z"), category: "耗材", description: "紙張", merchant: "文具店", amount: "540" }], receipts: [] }], isLoading: false }) }, review: { useMutation: () => ({ mutateAsync: mocks.review, isPending: false }) }, markPaid: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, directPublishAndPay: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, recordPdfExport: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } } } }));
vi.mock("../client/src/lib/reimbursementPdf", () => ({ exportReimbursementToPdf: vi.fn(), printReimbursement: vi.fn() }));

describe("報帳審核子頁", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("教師可在獨立頁面開啟審核視窗並留下審核說明", async () => {
    mocks.review.mockResolvedValue(undefined);
    mocks.invalidate.mockResolvedValue(undefined);
    render(<ReimbursementReview />);
    expect(screen.getByRole("heading", { name: "報帳審核" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回報帳管理" })).toHaveAttribute("href", "/reimbursements");
    fireEvent.click(screen.getByRole("button", { name: "審核" }));
    fireEvent.change(screen.getByLabelText("審核說明"), { target: { value: "收據與預算核對無誤" } });
    fireEvent.click(screen.getByRole("button", { name: "核准" }));
    await waitFor(() => expect(mocks.review).toHaveBeenCalledWith({ id: 81, decision: "approved", reviewNote: "收據與預算核對無誤" }));
    expect(mocks.invalidate).toHaveBeenCalledTimes(2);
  });
});
