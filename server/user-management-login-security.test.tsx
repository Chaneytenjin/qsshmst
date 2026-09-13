// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import UserManage from "../client/src/pages/UserManage";

const mocks = vi.hoisted(() => ({
  listUseQuery: vi.fn(),
  deletePreviewUseQuery: vi.fn(),
  securityUseQuery: vi.fn(),
  getTempPasswordUseQuery: vi.fn(),
  founderAccountDetailsUseQuery: vi.fn(),
  activationHistoryUseQuery: vi.fn(),
  activationPdfPreviewUseQuery: vi.fn(),
  updateRoleUseMutation: vi.fn(),
  toggleActiveUseMutation: vi.fn(),
  createUseMutation: vi.fn(),
  deleteUseMutation: vi.fn(),
  resetPasswordUseMutation: vi.fn(),
  resetPasswordMutate: vi.fn(),
  extendExpiryUseMutation: vi.fn(),
  extendExpiryMutate: vi.fn(),
  unlockUseMutation: vi.fn(),
  lockUseMutation: vi.fn(),
  lockMutate: vi.fn(),
  unlockMutate: vi.fn(),
  verifyPinUseMutation: vi.fn(),
  resendActivationUseMutation: vi.fn(),
  invalidate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ users: { list: { invalidate: mocks.invalidate }, loginSecurityStatus: { invalidate: mocks.invalidate }, getTempPassword: { reset: mocks.reset }, founderAccountDetails: { reset: mocks.reset }, activationCertificateHistory: { invalidate: mocks.invalidate }, previewActivationCertificate: { invalidate: mocks.invalidate } } }),
    users: {
      list: { useQuery: mocks.listUseQuery },
      deletePreview: { useQuery: mocks.deletePreviewUseQuery },
      loginSecurityStatus: { useQuery: mocks.securityUseQuery },
      getTempPassword: { useQuery: mocks.getTempPasswordUseQuery },
      founderAccountDetails: { useQuery: mocks.founderAccountDetailsUseQuery },
      activationCertificateHistory: { useQuery: mocks.activationHistoryUseQuery },
      previewActivationCertificate: { useQuery: mocks.activationPdfPreviewUseQuery },
      updateRole: { useMutation: mocks.updateRoleUseMutation },
      toggleActive: { useMutation: mocks.toggleActiveUseMutation },
      create: { useMutation: mocks.createUseMutation },
      delete: { useMutation: mocks.deleteUseMutation },
      resetPassword: { useMutation: mocks.resetPasswordUseMutation },
      extendTemporaryPasswordExpiry: { useMutation: mocks.extendExpiryUseMutation },
      unlockLoginAttempts: { useMutation: mocks.unlockUseMutation },
      lockLoginAttempts: { useMutation: mocks.lockUseMutation },
      batchSetTestAccountActive: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      sendActivationCertificate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      resendActivationCertificate: { useMutation: mocks.resendActivationUseMutation },
    },
    activationCertificates: { createDownload: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    auditPin: { verify: { useMutation: mocks.verifyPinUseMutation } },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, isFounder: true } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sampleUser = {
  id: 2,
  username: "student-01",
  name: "測試學生",
  email: "student@example.com",
  role: "student",
  studentId: "123456",
  department: null,
  isActive: true,
  isFounder: false,
  lastSignedIn: new Date("2026-08-12T08:00:00.000Z"),
};

function configureDefaultMocks() {
  mocks.listUseQuery.mockReturnValue({ data: [sampleUser], isLoading: false });
  mocks.deletePreviewUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  mocks.securityUseQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.getTempPasswordUseQuery.mockReturnValue({ data: undefined, isLoading: false });
  mocks.founderAccountDetailsUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  [mocks.updateRoleUseMutation, mocks.toggleActiveUseMutation, mocks.createUseMutation, mocks.deleteUseMutation].forEach((mutation) => mutation.mockReturnValue({ mutate: vi.fn(), isPending: false }));
  mocks.resetPasswordUseMutation.mockReturnValue({ mutate: mocks.resetPasswordMutate, isPending: false });
  mocks.extendExpiryUseMutation.mockReturnValue({ mutate: mocks.extendExpiryMutate, isPending: false });
  mocks.lockUseMutation.mockReturnValue({ mutate: mocks.lockMutate, isPending: false });
  mocks.unlockUseMutation.mockReturnValue({ mutate: mocks.unlockMutate, isPending: false });
  mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mocks.activationHistoryUseQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.activationPdfPreviewUseQuery.mockReturnValue({ data: undefined, isLoading: false });
  mocks.resendActivationUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
}

configureDefaultMocks();

describe("UserManage login security controls", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    configureDefaultMocks();
  });

  it("顯示登入失敗次數與鎖定倒數，並可由創始管理員解除鎖定", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T08:00:00.000Z"));
    mocks.listUseQuery.mockReturnValue({ data: [sampleUser], isLoading: false });
    mocks.securityUseQuery.mockReturnValue({
      data: [{ userId: 2, attemptCount: 3, lockedUntil: new Date("2026-08-12T08:12:00.000Z"), isLocked: true, remainingSeconds: 720 }],
      isLoading: false,
    });

    render(<UserManage />);

    expect(screen.getByText("登入安全")).toBeInTheDocument();
    expect(screen.getByText("失敗 3 次")).toBeInTheDocument();
    expect(screen.getByText("鎖定 12:00")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("解除登入鎖定"));
    expect(mocks.unlockMutate).toHaveBeenCalledWith({ id: 2 });
    expect(screen.getByTitle("帳號目前已鎖定")).toBeDisabled();
  });

  it("正常帳號顯示失敗計數並提供手動鎖定控制", () => {
    mocks.listUseQuery.mockReturnValue({ data: [sampleUser], isLoading: false });
    mocks.securityUseQuery.mockReturnValue({ data: [{ userId: 2, attemptCount: 1, lockedUntil: null, isLocked: false, remainingSeconds: 0 }], isLoading: false });

    render(<UserManage />);

    expect(screen.getByText("失敗 1 次")).toBeInTheDocument();
    expect(screen.getByText("正常")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("鎖定登入 15 分鐘"));
    expect(mocks.lockMutate).toHaveBeenCalledWith({ id: 2 });
  });

  it("安全狀態載入中時不會誤顯示為正常或失敗零次", () => {
    mocks.listUseQuery.mockReturnValue({ data: [sampleUser], isLoading: false });
    mocks.securityUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<UserManage />);

    expect(screen.getByText("登入安全狀態載入中")).toBeInTheDocument();
    expect(screen.queryByText(/失敗 \d+ 次/)).not.toBeInTheDocument();
    expect(screen.queryByText("正常")).not.toBeInTheDocument();
    screen.getAllByTitle("登入安全狀態載入中").forEach((button) => expect(button).toBeDisabled());
  });

  it("安全狀態查詢失敗時提供可辨識的錯誤提示並停用鎖定控制", () => {
    mocks.listUseQuery.mockReturnValue({ data: [sampleUser], isLoading: false });
    mocks.securityUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error("登入安全 API 暫時不可用") });

    render(<UserManage />);

    expect(screen.getByText("登入安全狀態載入失敗")).toBeInTheDocument();
    expect(screen.queryByText(/失敗 \d+ 次/)).not.toBeInTheDocument();
    screen.getAllByTitle("登入安全狀態載入失敗").forEach((button) => expect(button).toBeDisabled());
  });

  it("顯示臨時密碼生命週期狀態，並在確認後安全產生新的臨時密碼", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listUseQuery.mockReturnValue({ data: [{ ...sampleUser, isTemporaryPassword: false }], isLoading: false });

    render(<UserManage />);

    expect(screen.getByText("臨時密碼已失效")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("產生新的臨時密碼並使目前密碼失效"));
    expect(mocks.resetPasswordMutate).toHaveBeenCalledWith({ id: 2 }, expect.any(Object));
    expect(screen.queryByText(/^[A-Za-z0-9]{8,}$/)).not.toBeInTheDocument();
  });

  it("依臨時密碼期限顯示已到期與即將到期的醒目標籤", () => {
    mocks.listUseQuery.mockReturnValue({
      data: [
        { ...sampleUser, id: 3, username: "expired-student", isTemporaryPassword: true, temporaryPasswordExpiresAt: new Date(Date.now() - 60_000) },
        { ...sampleUser, id: 4, username: "expiring-student", isTemporaryPassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 30 * 60_000) },
      ],
      isLoading: false,
    });

    render(<UserManage />);

    expect(screen.getByText("臨時密碼已到期")).toBeInTheDocument();
    const expiringBadge = screen.getByText("即將到期");
    expect(expiringBadge).toHaveClass("text-rose-100", "font-bold");
    expect(expiringBadge.querySelector("svg")).toBeInTheDocument();
    expect(expiringBadge).toHaveAttribute("role", "status");
    expect(expiringBadge).toHaveAttribute("aria-label", "警告：測試學生的臨時密碼即將到期");
    fireEvent.click(screen.getByRole("button", { name: "一鍵延長 測試學生 的臨時密碼效期 12 小時" }));
    expect(mocks.extendExpiryMutate).toHaveBeenCalledWith({ id: 4 });
    expect(screen.getByRole("button", { name: "快速重設 測試學生 的密碼" })).toBeInTheDocument();
  });

  it("可篩選尚未完成首次設定、仍使用臨時密碼的帳號", () => {
    mocks.listUseQuery.mockReturnValue({
      data: [
        { ...sampleUser, id: 5, username: "pending-first-setup", name: "待設定帳號", isTemporaryPassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 60 * 60_000) },
        { ...sampleUser, id: 6, username: "completed-first-setup", name: "已設定帳號", isTemporaryPassword: false },
      ],
      isLoading: false,
    });

    render(<UserManage />);
    expect(screen.getByText("待首次設定")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("首次設定狀態篩選"), { target: { value: "pending" } });

    expect(screen.getByText("待設定帳號")).toBeInTheDocument();
    expect(screen.queryByText("已設定帳號")).not.toBeInTheDocument();
  });

  it("重設密碼成功後會直接開啟該帳號的啟用書寄送視窗", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const resetMutate = vi.fn((_input: { id: number }, callbacks?: { onSuccess?: () => void }) => callbacks?.onSuccess?.());
    mocks.resetPasswordUseMutation.mockReturnValue({ mutate: resetMutate, isPending: false });
    mocks.listUseQuery.mockReturnValue({ data: [{ ...sampleUser, isTemporaryPassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 60 * 60_000) }], isLoading: false });

    render(<UserManage />);
    fireEvent.click(screen.getByRole("button", { name: "快速重設 測試學生 的密碼" }));

    expect(resetMutate).toHaveBeenCalledWith({ id: 2 }, expect.any(Object));
    expect(screen.getByText("寄送帳號啟用書")).toBeInTheDocument();
    expect(screen.getByText("帳號啟用書對象")).toBeInTheDocument();
    expect(screen.getByDisplayValue("student@example.com")).toBeInTheDocument();
  });
});
