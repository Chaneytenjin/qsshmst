// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import UserManage from "../client/src/pages/UserManage";

const mocks = vi.hoisted(() => ({
  batchSetStatus: vi.fn(),
  sendActivationCertificate: vi.fn(),
  invalidate: vi.fn(),
  reset: vi.fn(),
  verifyPin: vi.fn(),
  resendActivation: vi.fn(),
  authUser: { id: 1, username: "Chaney", isFounder: true, role: "admin" },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ users: { list: { invalidate: mocks.invalidate }, loginSecurityStatus: { invalidate: mocks.invalidate }, getTempPassword: { reset: mocks.reset }, founderAccountDetails: { reset: mocks.reset }, activationCertificateHistory: { invalidate: mocks.invalidate } } }),
    users: {
      list: { useQuery: () => ({ data: [
        { id: 1, username: "Chaney", name: "主伺服器管理員", email: null, role: "admin", isActive: true, isFounder: true, isTestAccount: false, lastSignedIn: new Date() },
        { id: 9, username: "ui_test_1786514682037", name: "UI Test User", email: "ui@example.com", role: "student", isActive: true, isFounder: false, isTestAccount: true, lastSignedIn: new Date() },
        { id: 10, username: "standard_teacher", name: "正式教師帳號", email: "teacher@example.com", role: "teacher", isActive: true, isFounder: false, isTestAccount: false, lastSignedIn: new Date() },
      ], isLoading: false }) },
      deletePreview: { useQuery: () => ({ data: undefined, isLoading: false, error: null }) },
      loginSecurityStatus: { useQuery: () => ({ data: [], isLoading: false, error: null }) },
      updateRole: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      toggleActive: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      resetPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      extendTemporaryPasswordExpiry: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      unlockLoginAttempts: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      lockLoginAttempts: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      getTempPassword: { useQuery: () => ({ data: undefined, isLoading: false }) },
      founderAccountDetails: { useQuery: () => ({ data: undefined, isLoading: false, error: null }) },
      activationCertificateHistory: { useQuery: () => ({ data: [{ id: 21, certificateNumber: "QSM-ACT-1-TEST", recipientEmailMasked: "ce*****@example.com", hasPdfAttachment: true, sentAt: new Date("2026-08-12T00:00:00.000Z") }], isLoading: false }) },
      previewActivationCertificate: { useQuery: () => ({ data: { certificateNumber: "QSM-ACT-1-TEST", pdfDataUrl: "data:application/pdf;base64,JVBERi0xLjQ=", hasPdfAttachment: true }, isLoading: false, error: null }) },
      batchSetTestAccountActive: { useMutation: () => ({ mutate: mocks.batchSetStatus, isPending: false }) },
      sendActivationCertificate: { useMutation: () => ({ mutate: mocks.sendActivationCertificate, isPending: false }) },
      resendActivationCertificate: { useMutation: () => ({ mutate: mocks.resendActivation, isPending: false }) },
    },
    activationCertificates: { createDownload: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    auditPin: { verify: { useMutation: () => ({ mutateAsync: mocks.verifyPin, isPending: false }) } },
  },
}));

describe("UserManage 測試帳號控管", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocks.authUser = { id: 1, username: "Chaney", isFounder: true, role: "admin" };
  });

  it("標示、篩選並可批次停用系統辨識的測試帳號", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<UserManage />);

    expect(screen.getAllByText("測試帳號").length).toBeGreaterThan(0);
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "test" } });
    expect(screen.getByText("UI Test User")).toBeInTheDocument();
    expect(screen.queryByText("主伺服器管理員")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("選取測試帳號 ui_test_1786514682037"));
    fireEvent.click(screen.getByRole("button", { name: "批次停用" }));
    expect(mocks.batchSetStatus).toHaveBeenCalledWith({ ids: [9], isActive: false });
  });

  it("非伺服管理員即使收到測試帳號資料也不顯示分類、摘要或操作", () => {
    mocks.authUser = { id: 2, username: "ordinary-admin", isFounder: false, role: "admin" };
    render(<UserManage />);

    expect(screen.queryByText("UI Test User")).not.toBeInTheDocument();
    expect(screen.queryByText("測試帳號")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "批次停用" })).not.toBeInTheDocument();
  });

  it("可在右側操作欄指定收件信箱並確認寄送帳號啟用書", () => {
    render(<UserManage />);
    fireEvent.click(screen.getByTitle("寄送帳號啟用書"));
    expect(screen.getByText("帳號啟用書對象")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), { target: { value: "certificate@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "確認寄送啟用書" }));
    expect(mocks.sendActivationCertificate).toHaveBeenCalledWith({ id: 10, recipientEmail: "certificate@example.com" });
  });

  it("寄送前可預覽實際 PDF 附件，且歷程會標示附件狀態", () => {
    render(<UserManage />);
    fireEvent.click(screen.getByTitle("寄送帳號啟用書"));
    fireEvent.click(screen.getByRole("button", { name: "預覽 PDF 附件" }));

    expect(screen.getByText("這是伺服器端實際產生、即將附加至電子郵件的 PDF；不包含密碼、臨時密碼或驗證碼，並含圓形專屬章戳與可掃描的 QR Code 驗證連結")).toBeInTheDocument();
    expect(screen.getByTitle("帳號啟用書 PDF 附件預覽")).toHaveAttribute("src", "data:application/pdf;base64,JVBERi0xLjQ=");

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getAllByTitle("查看啟用書寄送歷程")[0]!);
    expect(screen.getByText("已附加 PDF")).toBeInTheDocument();
  });

  it("創始管理員帳號列會隱藏操作內容，其他帳號仍可開啟經 PIN 保護的完整資料檢視", () => {
    render(<UserManage />);

    const founderRow = screen.getByText("主伺服器管理員").closest("tr");
    if (!founderRow) throw new Error("找不到創始管理員資料列");
    expect(within(founderRow).getByText("受保護")).toBeInTheDocument();
    expect(within(founderRow).queryByTitle("寄送帳號啟用書")).not.toBeInTheDocument();
    expect(within(founderRow).queryByTitle("查看啟用書寄送歷程")).not.toBeInTheDocument();
    expect(within(founderRow).queryByRole("button", { name: "查看 主伺服器管理員 的完整帳號資料" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看 UI Test User 的完整帳號資料" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看 UI Test User 的完整帳號資料" }));
    expect(screen.getByText("稽核認證 PIN 驗證")).toBeInTheDocument();
  });

  it("新增帳號未填姓名或 Email 時顯示紅框，重開表單後不預先顯示紅字", async () => {
    render(<UserManage />);
    fireEvent.click(screen.getByRole("button", { name: /新增帳號/ }));
    fireEvent.click(screen.getByRole("button", { name: "建立帳號" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "姓名" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getAllByRole("alert")).not.toHaveLength(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: /新增帳號/ }));
    expect(screen.getByRole("textbox", { name: "姓名" })).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
