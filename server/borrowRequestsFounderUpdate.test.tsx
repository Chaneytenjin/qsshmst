// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BorrowRequests from "../client/src/pages/BorrowRequests";

const mocks = vi.hoisted(() => ({
  user: { id: 1, role: "admin", isFounder: true },
  requests: [{
    id: 73,
    equipmentName: "Sony A7 相機",
    requesterName: "王同學",
    quantity: 1,
    equipmentAvailableQuantity: 3,
    borrowDate: new Date("2026-08-20T08:00:00.000Z"),
    returnDate: new Date("2026-08-21T08:00:00.000Z"),
    purpose: "活動拍攝",
    status: "approved",
    reviewNote: "核准",
    founderLastUpdatedAt: new Date("2026-08-19T03:20:00.000Z"),
    founderUpdateReason: "調整拍攝排程",
    founderUpdateBefore: { quantity: 1, borrowDate: "2026-08-20T08:00:00.000Z", returnDate: "2026-08-21T08:00:00.000Z", purpose: "活動拍攝" },
    founderUpdateAfter: { quantity: 2, borrowDate: "2026-08-20T09:00:00.000Z", returnDate: "2026-08-22T08:00:00.000Z", purpose: "調整後活動拍攝" },
  }] as any[],
  updateMutate: vi.fn(),
  reviewMutate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ borrowRequests: { list: { invalidate: mocks.invalidate } }, dashboard: { stats: { invalidate: mocks.invalidate } } }),
    borrowRequests: {
      list: { useQuery: () => ({ data: mocks.requests, isLoading: false }) },
      review: { useMutation: () => ({ mutate: mocks.reviewMutate, isPending: false }) },
      founderUpdate: { useMutation: () => ({ mutate: mocks.updateMutate, isPending: false }) },
    },
  },
}));
vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../client/src/components/StatusBadge", () => ({ StatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("創始管理員借用申請手動修改介面", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.user = { id: 1, role: "admin", isFounder: true };
  });

  it("創始管理員可開啟所有狀態申請的修改表單並提交理由與更新內容", () => {
    render(<BorrowRequests />);
    expect(screen.getByText("調整拍攝排程")).toBeInTheDocument();
    expect(screen.getByText(/2026\/08\/19/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "備註" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "最近伺服管調整" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "最近創管調整" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看「Sony A7 相機」的完整備註" })).toHaveClass("borrow-request-review-note");
    fireEvent.click(screen.getByRole("button", { name: "修改申請 #73" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("伺服器管理員修改申請");
    expect(screen.getByText(/不變更申請人、器材或審核狀態/)).not.toHaveClass("border", "bg-[oklch(0.16_0.03_210)]");
    fireEvent.change(screen.getByLabelText(/申請數量/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/修改說明/), { target: { value: "更正活動拍攝排程" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存修改" }));

    expect(mocks.updateMutate).toHaveBeenCalledWith(expect.objectContaining({
      id: 73,
      quantity: 2,
      borrowDate: new Date("2026-08-19T16:00:00.000Z"),
      returnDate: new Date("2026-08-21T15:59:00.000Z"),
      purpose: "活動拍攝",
      reason: "更正活動拍攝排程",
    }));
  });

  it("點擊最近伺服管調整摘要可展開完整修改前後差異", () => {
    render(<BorrowRequests />);

    const summaryButton = screen.getByRole("button", { name: /調整拍攝排程/ });
    expect(summaryButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(summaryButton);

    expect(summaryButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("創始管理員修改完整差異")).toBeInTheDocument();
    expect(screen.getByText("修改前")).toBeInTheDocument();
    expect(screen.getByText("修改後")).toBeInTheDocument();
    expect(screen.getByText("調整後活動拍攝")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "dd" })).toBeInTheDocument();
  });

  it("用途與備註皆以按鈕開啟完整內容彈窗", () => {
    render(<BorrowRequests />);

    expect(screen.queryByText("活動拍攝")).not.toBeInTheDocument();
    const purposeButton = screen.getByRole("button", { name: "查看「Sony A7 相機」的完整用途" });
    expect(purposeButton).toHaveTextContent("查看用途");
    fireEvent.click(purposeButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("Sony A7 相機的完整用途");
    expect(screen.getByRole("dialog")).toHaveTextContent("活動拍攝");
    fireEvent.click(screen.getByRole("button", { name: "關閉內容彈窗" }));

    const noteButton = screen.getByRole("button", { name: "查看「Sony A7 相機」的完整備註" });
    expect(noteButton).toHaveTextContent("查看備註");
    fireEvent.click(noteButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("Sony A7 相機的完整備註");
    expect(screen.getByRole("dialog")).toHaveTextContent("核准");
  });

  it("非創始管理員不會看到手動修改申請控制", () => {
    mocks.user = { id: 2, role: "admin", isFounder: false };
    render(<BorrowRequests />);

    expect(screen.queryByRole("button", { name: "修改申請 #73" })).not.toBeInTheDocument();
  });

  it("保留關鍵字與狀態篩選，但不再提供借用時間範圍篩選", () => {
    render(<BorrowRequests />);

    expect(screen.getByPlaceholderText("搜尋器材或申請人...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /待審核/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("借用時間起始日期")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("借用時間結束日期")).not.toBeInTheDocument();
  });

  it("伺服器管理員修改申請會以可借數量限制的下拉選單帶入目前數量與用途提示", () => {
    render(<BorrowRequests />);
    fireEvent.click(screen.getByRole("button", { name: "修改申請 #73" }));

    const quantitySelect = screen.getByLabelText(/申請數量/);
    expect(quantitySelect.tagName).toBe("SELECT");
    expect(quantitySelect).toHaveValue("1");
    expect(Array.from((quantitySelect as HTMLSelectElement).options).map((option) => option.value)).toEqual(["", "1", "2", "3", "4"]);
    expect(screen.getByRole("textbox", { name: /用途/ })).toHaveAttribute("placeholder", "輸入文字說明");
    expect(screen.getByLabelText(/借用日/)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/借用日/)).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("將以當日 00:00 借出")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/歸還日/)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/歸還日/)).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("將以當日 23:59 歸還")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存修改" })).toBeEnabled();
  });

  it("伺服器管理員修改申請的數量、借用日、歸還日與用途未填時會顯示紅框，重開後會重設", () => {
    render(<BorrowRequests />);
    fireEvent.click(screen.getByRole("button", { name: "修改申請 #73" }));

    const quantitySelect = screen.getByLabelText(/申請數量/);
    const borrowDate = screen.getByLabelText(/借用日/);
    const returnDate = screen.getByLabelText(/歸還日/);
    const purpose = screen.getByRole("textbox", { name: /用途/ });
    fireEvent.change(quantitySelect, { target: { value: "" } });
    fireEvent.change(borrowDate, { target: { value: "" } });
    fireEvent.change(returnDate, { target: { value: "" } });
    fireEvent.change(purpose, { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/修改說明/), { target: { value: "調整申請內容" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存修改" }));

    expect(mocks.updateMutate).not.toHaveBeenCalled();
    [quantitySelect, borrowDate, returnDate, purpose].forEach((field) => expect(field).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getAllByRole("alert")).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "修改申請 #73" }));
    [screen.getByLabelText(/申請數量/), screen.getByLabelText(/借用日/), screen.getByLabelText(/歸還日/), screen.getByRole("textbox", { name: /用途/ })].forEach((field) => expect(field).toHaveAttribute("aria-invalid", "false"));
  });

  it("伺服器管理員修改申請允許略過修改說明後儲存", () => {
    render(<BorrowRequests />);
    fireEvent.click(screen.getByRole("button", { name: "修改申請 #73" }));

    const reason = screen.getByLabelText("修改說明");
    expect(reason).not.toBeRequired();
    expect(reason).toHaveAttribute("placeholder", "選填，請留下本次手動調整原因");
    fireEvent.click(screen.getByRole("button", { name: "儲存修改" }));
    expect(mocks.updateMutate).toHaveBeenCalledWith(expect.objectContaining({ id: 73, reason: undefined }));
  });

  it("拒絕申請時要求填寫拒絕原因，並在重新開啟時重設錯誤狀態", () => {
    mocks.requests = [{ ...mocks.requests[0], id: 74, status: "pending", reviewNote: null }];
    render(<BorrowRequests />);

    fireEvent.click(screen.getByRole("button", { name: "拒絕申請 #74" }));
    const reasonInput = screen.getByLabelText(/拒絕原因/);
    expect(reasonInput).toHaveAttribute("placeholder", "請填寫拒絕原因");
    fireEvent.click(screen.getByRole("button", { name: "確認拒絕" }));
    expect(mocks.reviewMutate).not.toHaveBeenCalled();
    expect(reasonInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("請填寫拒絕原因");

    fireEvent.change(reasonInput, { target: { value: "時段衝突" } });
    expect(reasonInput).toHaveAttribute("aria-invalid", "false");
    fireEvent.click(screen.getByRole("button", { name: "確認拒絕" }));
    expect(mocks.reviewMutate).toHaveBeenCalledWith({ id: 74, status: "rejected", reviewNote: "時段衝突" });

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "拒絕申請 #74" }));
    expect(screen.getByLabelText(/拒絕原因/)).toHaveAttribute("aria-invalid", "false");
  });

});
