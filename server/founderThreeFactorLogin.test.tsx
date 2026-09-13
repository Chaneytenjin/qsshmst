// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import Login from "../client/src/pages/Login";

const mocks = vi.hoisted(() => ({
  loginOptions: undefined as any,
  twoFactorOptions: undefined as any,
  recoveryCodeOptions: undefined as any,
  founderPinOptions: undefined as any,
  founderPinSetupOptions: undefined as any,
  firstLoginOptions: undefined as any,
  loginMutate: vi.fn(),
  twoFactorMutate: vi.fn(),
  recoveryCodeMutate: vi.fn(),
  founderPinMutate: vi.fn(),
  founderPinSetupMutate: vi.fn(),
  firstLoginMutate: vi.fn(),
  recordExpiredLoginChallengeMutate: vi.fn(),
  navigate: vi.fn(),
  authMeFetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: mocks.authMeFetch } } }),
    systemMaintenance: { status: { useQuery: () => ({ data: { systemMode: "online", maintenanceMode: false, isScheduled: false, scheduledMode: null, scheduledFor: null, announcement: null, estimatedRestoredAt: null, updatedAt: null }, isLoading: false, error: null }) } },
    customAuth: {
      login: { useMutation: (options: unknown) => { mocks.loginOptions = options; return { mutate: mocks.loginMutate, isPending: false }; } },
      verifyTwoFactorLogin: { useMutation: (options: unknown) => { mocks.twoFactorOptions = options; return { mutate: mocks.twoFactorMutate, isPending: false }; } },
      verifyTwoFactorRecoveryCode: { useMutation: (options: unknown) => { mocks.recoveryCodeOptions = options; return { mutate: mocks.recoveryCodeMutate, isPending: false }; } },
      verifyFounderLoginPin: { useMutation: (options: unknown) => { mocks.founderPinOptions = options; return { mutate: mocks.founderPinMutate, isPending: false }; } },
      completeFounderPinSetup: { useMutation: (options: unknown) => { mocks.founderPinSetupOptions = options; return { mutate: mocks.founderPinSetupMutate, isPending: false }; } },
      completeFirstLoginSetup: { useMutation: (options: unknown) => { mocks.firstLoginOptions = options; return { mutate: mocks.firstLoginMutate, isPending: false }; } },
      recordExpiredLoginChallenge: { useMutation: () => ({ mutate: mocks.recordExpiredLoginChallengeMutate, isPending: false }) },
      beginPasskeyLogin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      finishPasskeyLogin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("../client/src/components/BrandLogo", () => ({ BrandLogo: () => <div aria-label="品牌標誌" /> }));
vi.mock("wouter", () => ({ useLocation: () => ["/login", mocks.navigate] }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo } }));

describe("創始管理員三因素登入介面", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loginOptions = undefined;
    mocks.twoFactorOptions = undefined;
    mocks.recoveryCodeOptions = undefined;
    mocks.founderPinOptions = undefined;
    mocks.founderPinSetupOptions = undefined;
    mocks.firstLoginOptions = undefined;
    mocks.recordExpiredLoginChallengeMutate.mockReset();
    mocks.authMeFetch.mockResolvedValue({ id: 1, username: "media-user" });
  });

  it("未啟用 2FA 的創始管理員會在密碼後進入 PIN 第二因素，且不會導向系統", () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: false, requiresFounderPin: true, founderPinChallengeToken: "p".repeat(32), challengeExpiresAt: new Date(Date.now() + 5 * 60 * 1000) }));

    expect(screen.getByRole("form", { name: "創始管理員登入 PIN 驗證" })).toBeInTheDocument();
    expect(screen.queryByText("驗證挑戰剩餘時間")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "驗證挑戰剩餘時間" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "認證" })).toBeDisabled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("創始管理員收到雙 PIN 初始設定要求時，僅可在登入期間完成不同的兩組 PIN", () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: false, requiresFounderPinSetup: true, founderPinSetupToken: "i".repeat(32), founderPinSetupExpiresAt: new Date(Date.now() + 5 * 60 * 1000) }));

    expect(screen.getByTestId("founder-pin-setup-dialog")).toBeInTheDocument();
    expect(screen.getByText(/完成後系統不提供設定、重設或變更功能/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("登入 PIN"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("確認登入 PIN"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("稽核認證 PIN"), { target: { value: "654321" } });
    fireEvent.change(screen.getByLabelText("確認稽核認證 PIN"), { target: { value: "654321" } });
    fireEvent.submit(screen.getByRole("button", { name: "完成雙 PIN 初始設定並進入系統" }).closest("form")!);

    expect(mocks.founderPinSetupMutate).toHaveBeenCalledWith({
      challengeToken: "i".repeat(32),
      loginPin: "123456",
      confirmLoginPin: "123456",
      auditPin: "654321",
      confirmAuditPin: "654321",
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("已啟用 2FA 的創始管理員完成驗證器步驟後，才會顯示 PIN 第三因素並提交挑戰 Token", () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: true, requiresFounderPin: true, twoFactorChallengeToken: "t".repeat(32) }));
    expect(screen.getByRole("form", { name: "雙因素驗證" })).toBeInTheDocument();

    act(() => mocks.twoFactorOptions.onSuccess({ success: false, requiresTwoFactor: false, requiresFounderPin: true, founderPinChallengeToken: "p".repeat(32) }));
    const pinInput = screen.getByLabelText("登入 PIN 碼");
    fireEvent.change(pinInput, { target: { value: "123456" } });
    fireEvent.submit(screen.getByRole("form", { name: "創始管理員登入 PIN 驗證" }));

    expect(mocks.founderPinMutate).toHaveBeenCalledWith({ challengeToken: "p".repeat(32), pin: "123456" });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("挑戰期限在背景執行，到期後會清除挑戰與帳密並安全返回帳號密碼登入", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T03:00:00.000Z"));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("輸入帳號"), { target: { value: "expired-founder" } });
    fireEvent.change(screen.getByPlaceholderText("輸入密碼"), { target: { value: "expired-password" } });

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: true, requiresFounderPin: true, twoFactorChallengeToken: "t".repeat(32), challengeExpiresAt: new Date("2026-08-12T03:00:02.000Z") }));
    expect(screen.queryByText("驗證挑戰剩餘時間")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("form", { name: "雙因素驗證" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("login-challenge-expiry-transition")).toBeInTheDocument();
    expect(mocks.recordExpiredLoginChallengeMutate).toHaveBeenCalledWith({ challengeToken: "t".repeat(32) });
    expect(screen.getByPlaceholderText("輸入帳號")).toHaveValue("");
    expect(screen.getByPlaceholderText("輸入密碼")).toHaveValue("");

    act(() => vi.advanceTimersByTime(680));
    expect(screen.queryByTestId("login-challenge-expiry-transition")).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "雙因素驗證" })).not.toBeInTheDocument();
  });

  it("一般帳密驗證成功後會先水合新的工作階段，再導向儀表板", async () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: true, requiresTwoFactor: false, user: { username: "media-user", isTemporaryPassword: false } }));

    await waitFor(() => expect(mocks.authMeFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"));
  });

  it("登入頁左上角提供返回首頁控制", () => {
    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "返回首頁" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });

  it("登入密碼欄可透過眼睛按鈕切換顯示與隱藏，且不影響表單欄位", () => {
    render(<Login />);

    const passwordInput = screen.getByPlaceholderText("輸入密碼");
    expect(passwordInput).toHaveAttribute("type", "password");
    const revealButton = screen.getByRole("button", { name: "顯示密碼" });
    expect(revealButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(revealButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "隱藏密碼" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "隱藏密碼" }));

    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("臨時密碼首次登入會強制設定自訂帳號與新密碼，完成前不會建立工作階段", () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: false, requiresFirstLoginSetup: true, firstLoginSetupToken: "s".repeat(32), firstLoginSetupExpiresAt: new Date(Date.now() + 5 * 60 * 1000), user: { username: "temporary-user" } }));

    expect(screen.getByText("完成首次登入設定")).toBeInTheDocument();
    expect(screen.getByDisplayValue("temporary-user")).toBeInTheDocument();
    expect(mocks.authMeFetch).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("自訂帳號"), { target: { value: "custom-user" } });
    fireEvent.change(screen.getByLabelText("新密碼"), { target: { value: "NewPass1!" } });
    fireEvent.change(screen.getByLabelText("確認新密碼"), { target: { value: "NewPass1!" } });

    expect(screen.getByTestId("first-login-password-strength")).toHaveTextContent("密碼強度");
    expect(screen.getByTestId("first-login-password-strength")).toHaveTextContent("強");
    expect(screen.getByRole("progressbar", { name: "新密碼強度" })).toHaveAttribute("aria-valuenow", "4");
    fireEvent.submit(screen.getByRole("button", { name: "儲存設定並進入系統" }).closest("form")!);

    expect(mocks.firstLoginMutate).toHaveBeenCalledWith({ challengeToken: "s".repeat(32), username: "custom-user", newPassword: "NewPass1!", confirmPassword: "NewPass1!" });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("已完成首次設定的帳號在重設密碼時會固定帳號名稱，僅可設定新密碼", () => {
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: false, requiresTwoFactor: false, requiresFirstLoginSetup: true, passwordSetupMode: "password_reset", firstLoginSetupToken: "r".repeat(32), firstLoginSetupExpiresAt: new Date(Date.now() + 5 * 60 * 1000), user: { username: "locked-founder", usernameLocked: true } }));

    expect(screen.getByTestId("password-reset-dialog")).toBeInTheDocument();
    expect(screen.getByText("密碼重設")).toBeInTheDocument();
    expect(screen.queryByText("完成首次登入設定")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("帳號（固定）")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("自訂帳號")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("locked-founder")).not.toBeInTheDocument();
    expect(screen.getByText("管理員已重設您的密碼請使用新的臨時密碼登入後，立即設定新密碼；帳號名稱維持不變")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新密碼並進入系統" })).toBeInTheDocument();
  });

  it("未取得有效工作階段時不會誤導向儀表板，並提示重新登入", async () => {
    mocks.authMeFetch.mockResolvedValue(null);
    render(<Login />);

    act(() => mocks.loginOptions.onSuccess({ success: true, user: { username: "general-user", isTemporaryPassword: false } }));

    await waitFor(() => expect(mocks.authMeFetch).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("登入工作階段建立失敗，請重新登入；若問題持續，請聯絡管理員");
  });
});
