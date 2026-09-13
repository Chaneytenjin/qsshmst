// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Profile from "../client/src/pages/Profile";

type PasskeyListItem = {
  credentialId: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  registeredDeviceLabel: string | null;
  deviceType: "multiDevice" | "singleDevice";
  backedUp: boolean;
  transports: string[];
};

const mocks = vi.hoisted(() => ({
  begin: vi.fn(), confirm: vi.fn(), disable: vi.fn(), generateRecoveryCodes: vi.fn(), confirmRecoveryCodesSafelyStored: vi.fn(), revoke: vi.fn(), confirmDeviceAlert: vi.fn(), revokeDeviceAlert: vi.fn(), blockHighRiskDeviceIp: vi.fn(), verifyAuditPin: vi.fn(), sendEmail: vi.fn(), verifyEmail: vi.fn(), changePassword: vi.fn(), logout: vi.fn(), beginPasskey: vi.fn(), finishPasskey: vi.fn(), renamePasskey: vi.fn(), deletePasskey: vi.fn(), invalidateProfile: vi.fn(), invalidateAuth: vi.fn(),
  profileQuery: { data: { user: { username: "security-user", realName: "Security User", email: "security@example.com", phone: "", department: "", isFounder: true } }, isLoading: false, error: null },
  preferencesQuery: { data: { theme: "dark", language: "zh-TW", notificationsEnabled: true, emailNotifications: false, borrowingNotifications: true }, error: null },
  twoFactorQuery: { data: { enabled: false, enabledAt: null as Date | null, lastUsedAt: null as Date | null }, isLoading: false, refetch: vi.fn() },
  recoveryCodeQuery: { data: { enabled: false, availableCount: 0, totalGenerated: 0, lastGeneratedAt: null as Date | null }, isLoading: false, refetch: vi.fn() },
  devicesQuery: { data: [{ deviceId: "device-12345678901234567890", deviceName: "Google Chrome · Windows", ipAddress: "203.0.113.9", lastSeenAt: new Date(), revokedAt: null, isCurrent: true }], isLoading: false, refetch: vi.fn() },
  emailVerificationQuery: { data: { email: "security@example.com", verified: false, verifiedAt: null, pending: true, expiresAt: new Date(Date.now() + 600_000), resendAvailableInSeconds: 0, remainingAttempts: 5 }, isLoading: false, refetch: vi.fn() },
  securityActivityQuery: { data: [{ id: 10, action: "changePassword", label: "已變更密碼", entityName: "密碼", createdAt: new Date("2026-08-12T01:00:00.000Z") }], isLoading: false, refetch: vi.fn() },
  passkeysQuery: { data: [] as PasskeyListItem[], isLoading: false, refetch: vi.fn() },
  pendingDeviceAlertsQuery: { data: [{ id: 12, deviceId: "new-device", deviceName: "Safari · iPhone", ipAddress: "198.51.100.5", userAgent: "Safari", geoCountry: "Taiwan", geoRegion: "New Taipei City", geoCity: "Tucheng", geoTimezone: "Asia/Taipei", geoAsn: "15169", geoIsp: "Google LLC", geoOrganization: "Google LLC", geoDomain: "google.com", geoSource: "ipwho.is", createdAt: new Date(), firstSeenAt: new Date(), lastSeenAt: new Date(), revokedAt: null }], isLoading: false, refetch: vi.fn() },
  passwordStatusQuery: { data: { applies: true, isDue: false, passwordChangedAt: new Date("2026-08-01T00:00:00.000Z"), dueAt: new Date("2027-01-28T00:00:00.000Z"), daysRemaining: 168 }, refetch: vi.fn() },
  dynamicUserQrCodeQuery: { data: { value: "QSSH-USER-V2:1:1:signature", expiresAt: new Date(Date.now() + 300_000), expiresInSeconds: 300 }, isLoading: false, refetch: vi.fn() },
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ profile: { getProfile: { invalidate: mocks.invalidateProfile } }, auth: { me: { invalidate: mocks.invalidateAuth } } }),
    profile: {
      getProfile: { useQuery: () => mocks.profileQuery },
      getPreferences: { useQuery: () => mocks.preferencesQuery },
      emailVerificationStatus: { useQuery: () => mocks.emailVerificationQuery },
      securityActivity: { useQuery: () => mocks.securityActivityQuery },
      pendingDeviceAlerts: { useQuery: () => mocks.pendingDeviceAlertsQuery },
      passwordChangeStatus: { useQuery: () => mocks.passwordStatusQuery },
      dynamicUserQrCode: { useQuery: () => mocks.dynamicUserQrCodeQuery },
      sendEmailVerification: { useMutation: () => ({ mutate: mocks.sendEmail, isPending: false }) },
      verifyEmail: { useMutation: () => ({ mutate: mocks.verifyEmail, isPending: false }) },
      updateProfile: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      updatePreferences: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      changePassword: { useMutation: (options: { onSuccess?: () => void | Promise<void> }) => ({ mutateAsync: async (input: unknown) => { mocks.changePassword(input); await options.onSuccess?.(); }, isPending: false }) },
      confirmDeviceAlert: { useMutation: () => ({ mutate: mocks.confirmDeviceAlert, isPending: false }) },
      revokeDeviceAlert: { useMutation: () => ({ mutate: mocks.revokeDeviceAlert, isPending: false }) },
      blockHighRiskDeviceIp: { useMutation: () => ({ mutate: mocks.blockHighRiskDeviceIp, isPending: false }) },
    },
    accountSecurity: {
      twoFactorStatus: { useQuery: () => mocks.twoFactorQuery },
      twoFactorRecoveryCodeStatus: { useQuery: () => mocks.recoveryCodeQuery },
      devices: { useQuery: () => mocks.devicesQuery },
      passkeys: { useQuery: () => mocks.passkeysQuery },
      revokeDevice: { useMutation: () => ({ mutate: mocks.revoke, isPending: false }) },
      beginPasskeyRegistration: { useMutation: () => ({ mutateAsync: mocks.beginPasskey, isPending: false }) },
      finishPasskeyRegistration: { useMutation: () => ({ mutateAsync: mocks.finishPasskey, isPending: false }) },
      renamePasskey: { useMutation: () => ({ mutate: mocks.renamePasskey, isPending: false }) },
      deletePasskey: { useMutation: () => ({ mutate: mocks.deletePasskey, isPending: false }) },
      generateTwoFactorRecoveryCodes: { useMutation: (options: { onSuccess?: (data: { codes: string[]; count: number }) => void | Promise<void> }) => ({ mutate: async (input: unknown) => { mocks.generateRecoveryCodes(input); await options.onSuccess?.({ codes: ["ABCD-EFGH-JKLM", "NPQR-STUV-WXYZ"], count: 2 }); }, isPending: false }) },
      confirmTwoFactorRecoveryCodesSafelyStored: { useMutation: (options: { onSuccess?: () => void | Promise<void> }) => ({ mutate: async (input: unknown) => { mocks.confirmRecoveryCodesSafelyStored(input); await options.onSuccess?.(); }, isPending: false }) },
    },
    customAuth: {
      beginTwoFactorSetup: { useMutation: () => ({ mutate: mocks.begin, isPending: false }) },
      confirmTwoFactorSetup: { useMutation: () => ({ mutate: mocks.confirm, isPending: false }) },
      disableTwoFactor: { useMutation: () => ({ mutate: mocks.disable, isPending: false }) },
    },
    auth: { logout: { useMutation: () => ({ mutate: mocks.logout, isPending: false }) } },
    auditPin: { verify: { useMutation: () => ({ mutateAsync: mocks.verifyAuditPin, isPending: false }) } },
  },
}));

vi.mock("../client/src/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

describe("Profile account security", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.passkeysQuery.data = [];
    mocks.twoFactorQuery.data = { enabled: false, enabledAt: null, lastUsedAt: null };
    mocks.recoveryCodeQuery.data = { enabled: false, availableCount: 0, totalGenerated: 0, lastGeneratedAt: null };
  });

  it("在雙因素與恢復子頁提供雙因素驗證設定入口", () => {
    render(<Profile initialTab="security" securitySection="two-factor" />);

    expect(screen.getByText("雙因素驗證（2FA）")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("輸入目前密碼以開始設定"), { target: { value: "CurrentPass123" } });
    fireEvent.click(screen.getByRole("button", { name: "設定雙因素驗證" }));
    expect(mocks.begin).toHaveBeenCalledWith({ password: "CurrentPass123" });
  });

  it("已啟用 2FA 時可產生一次性顯示的備用恢復碼", async () => {
    mocks.twoFactorQuery.data = { enabled: true, enabledAt: new Date(), lastUsedAt: null };
    mocks.recoveryCodeQuery.data = { enabled: true, availableCount: 0, totalGenerated: 0, lastGeneratedAt: null };
    render(<Profile initialTab="security" securitySection="two-factor" />);

    expect(screen.getByText("備用恢復碼")).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "備用恢復碼低庫存提醒" })).toHaveTextContent("備用恢復碼即將用盡");
    expect(screen.getByText("恢復碼安全保存與列印")).toBeInTheDocument();
    expect(screen.getByText("安全保存與使用注意事項")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("恢復碼目前密碼"), { target: { value: "CurrentPass123" } });
    fireEvent.change(screen.getByLabelText("恢復碼驗證器六位數碼"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "產生 10 組備用恢復碼" }));

    await waitFor(() => expect(mocks.generateRecoveryCodes).toHaveBeenCalledWith({ password: "CurrentPass123", code: "123456" }));
    expect((await screen.findAllByText("ABCD-EFGH-JKLM")).length).toBe(2);
    expect(screen.getByText("請立即保存這些恢復碼")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "列印安全保存版" })).toBeInTheDocument();
    expect(screen.getByLabelText("2FA 備用恢復碼列印版")).toHaveTextContent("每組僅限使用一次");
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "列印安全保存版" }));
    expect(screen.getByRole("button", { name: "已安全保存" })).toBeInTheDocument();
    await waitFor(() => expect(printSpy).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "已安全保存" }));
    await waitFor(() => expect(mocks.confirmRecoveryCodesSafelyStored).toHaveBeenCalledWith({ displayedCodeCount: 2 }));
    expect(mocks.securityActivityQuery.refetch).toHaveBeenCalled();
    printSpy.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "我已安全保存，關閉明碼" }));
    expect(screen.queryByText("ABCD-EFGH-JKLM")).not.toBeInTheDocument();
  });

  it("重新產生時會先要求確認舊恢復碼撤銷", async () => {
    mocks.twoFactorQuery.data = { enabled: true, enabledAt: new Date(), lastUsedAt: null };
    mocks.recoveryCodeQuery.data = { enabled: true, availableCount: 2, totalGenerated: 10, lastGeneratedAt: new Date() };
    render(<Profile initialTab="security" securitySection="two-factor" />);

    fireEvent.change(screen.getByLabelText("恢復碼目前密碼"), { target: { value: "CurrentPass123" } });
    fireEvent.change(screen.getByLabelText("恢復碼驗證器六位數碼"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "重新產生並撤銷舊恢復碼" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("此操作會立即撤銷目前所有未使用的備用恢復碼");
    expect(mocks.generateRecoveryCodes).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "確認撤銷並重新產生" }));
    await waitFor(() => expect(mocks.generateRecoveryCodes).toHaveBeenCalledWith({ password: "CurrentPass123", code: "123456" }));
  });

  it("在通行密鑰清單顯示註冊裝置與最近使用時間", () => {
    mocks.passkeysQuery.data = [{
      credentialId: "credential-iphone-1",
      name: "我的 iPhone",
      createdAt: new Date("2026-08-01T01:00:00.000Z"),
      lastUsedAt: new Date("2026-08-12T01:30:00.000Z"),
      registeredDeviceLabel: "iPhone · Safari",
      deviceType: "multiDevice",
      backedUp: true,
      transports: ["internal"],
    }];

    render(<Profile initialTab="security" securitySection="passkeys" />);

    expect(screen.getByText("我的 iPhone")).toBeInTheDocument();
    expect(screen.getByText("註冊裝置")).toBeInTheDocument();
    expect(screen.getByText("iPhone · Safari")).toBeInTheDocument();
    const lastUsedLabel = screen.getByText("最近使用");
    expect(lastUsedLabel).toBeInTheDocument();
    expect(lastUsedLabel.nextElementSibling).toHaveTextContent(/2026\/8\/12/);
    expect(screen.getByText("可同步通行密鑰 · 已啟用備份")).toBeInTheDocument();
  });

  it("個人資料頁不提供自訂頭像上傳或裁切入口", () => {
    render(<Profile />);

    expect(screen.queryByText("個人頭像")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("上傳個人頭像")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拖放或選擇個人頭像" })).not.toBeInTheDocument();
  });

  it("顯示未知設備登入警告，並提供本人確認與撤銷設備操作", () => {
    render(<Profile initialTab="security" securitySection="devices" />);

    expect(screen.getByText("未知設備登入警告")).toBeInTheDocument();
    expect(screen.getByText("Safari · iPhone")).toBeInTheDocument();
    expect(screen.getByText(/網路位置：Tucheng，New Taipei City，Taiwan/)).toBeInTheDocument();
    expect(screen.getByText(/時區：Asia\/Taipei/)).toBeInTheDocument();
    expect(screen.getByText(/公開 IP 地理位置推估；僅供安全判斷，可能不精確/)).toBeInTheDocument();
    expect(screen.getByText(/網路歸屬：Google LLC · Google LLC · ASN：AS15169/)).toBeInTheDocument();
    expect(screen.getByText("網域：google.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "這是我的設備" }));
    expect(mocks.confirmDeviceAlert).toHaveBeenCalledWith({ alertId: 12 });
    fireEvent.click(screen.getByRole("button", { name: "不是我的設備，立即撤銷" }));
    expect(mocks.revokeDeviceAlert).toHaveBeenCalledWith({ alertId: 12 });
  });

  it("創始管理員在已驗證 PIN 後可一鍵封鎖高風險未知設備 IP 並撤銷設備", () => {
    window.sessionStorage.setItem("qingshui-audit-pin-verified-at", Date.now().toString());
    render(<Profile initialTab="security" securitySection="devices" />);

    fireEvent.click(screen.getByRole("button", { name: "高風險：封鎖 IP 並撤銷" }));
    expect(mocks.blockHighRiskDeviceIp).toHaveBeenCalledWith({ alertId: 12 });
    window.sessionStorage.removeItem("qingshui-audit-pin-verified-at");
  });

  it("以即時倒數呈現驗證碼重送冷卻", () => {
    mocks.emailVerificationQuery.data.resendAvailableInSeconds = 30;
    render(<Profile />);

    expect(screen.getByRole("button", { name: "可於 30 秒後重送" })).toBeDisabled();
    expect(screen.getByLabelText("驗證碼重送冷卻進度")).toHaveTextContent("請等待 30 秒");
    mocks.emailVerificationQuery.data.resendAvailableInSeconds = 0;
  });

  it("密碼修改成功後會清空表單並提示即將登出及新密碼重新登入", async () => {
    render(<Profile initialTab="security" securitySection="password" />);
    fireEvent.change(screen.getByPlaceholderText("輸入目前密碼"), { target: { value: "CurrentPass123" } });
    fireEvent.change(screen.getByPlaceholderText("輸入新密碼"), { target: { value: "NewPass123" } });
    fireEvent.change(screen.getByPlaceholderText("再次輸入新密碼"), { target: { value: "NewPass123" } });
    fireEvent.click(screen.getByRole("button", { name: "修改密碼" }));

    await waitFor(() => expect(screen.getByText("密碼已更新成功")).toBeInTheDocument());
    expect(screen.getByText(/下次登入請使用新密碼/)).toHaveTextContent("5 秒後自動登出");
    expect(screen.getByPlaceholderText("輸入目前密碼")).toHaveValue("");
    expect(mocks.changePassword).toHaveBeenCalledWith({ currentPassword: "CurrentPass123", newPassword: "NewPass123", confirmPassword: "NewPass123" });
  });

  it("在登入密碼子頁移除安全提示並顯示即時強度與淺色高對比範圍", () => {
    render(<Profile initialTab="security" securitySection="password" />);
    fireEvent.change(screen.getByPlaceholderText("輸入新密碼"), { target: { value: "Qingshui!2026Media" } });

    expect(screen.getByRole("heading", { name: "登入密碼" })).toBeInTheDocument();
    expect(screen.queryByText("安全提示")).not.toBeInTheDocument();
    expect(screen.getByLabelText("密碼強度")).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByText("強")).toBeInTheDocument();
    const profileSource = readFileSync(resolve(process.cwd(), "client/src/pages/Profile.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(profileSource).toContain('password: "登入密碼"');
    expect(profileSource).toContain('className="login-password-security-page scroll-mt-5"');
    expect(css).toContain("html:not(.dark) .login-password-security-card");
    expect(css).toContain("html:not(.dark) .login-password-security-card [role=\"alert\"]");
  });

  it("在設備與安全活動子頁顯示本人的帳號安全異動歷史", () => {
    render(<Profile initialTab="security" securitySection="devices" />);

    expect(screen.getByText("帳號安全異動歷史")).toBeInTheDocument();
    expect(screen.getByText("已變更密碼")).toBeInTheDocument();
  });

  it("安全設定總覽只保留四個子分頁入口，不重複顯示設定內容", () => {
    render(<Profile initialTab="security" />);

    expect(screen.getByTestId("security-section-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("security-section-navigation")).toHaveClass("profile-security-section-navigation");
    expect(screen.getByRole("heading", { name: "安全設定" })).toBeInTheDocument();
    expect(screen.queryByText("安全設定總覽")).not.toBeInTheDocument();
    expect(screen.queryByText("選擇下列項目進入獨立的安全管理子頁")).not.toBeInTheDocument();
    expect(screen.getByTestId("security-section-links")).toHaveClass("grid-cols-1");
    expect(screen.getByTestId("security-section-links")).not.toHaveClass("sm:grid-cols-2");
    expect(screen.queryByText("雙因素驗證（2FA）")).not.toBeInTheDocument();
    expect(screen.queryByText("登入設備管理")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新增通行密鑰" })).not.toBeInTheDocument();
  });

  it("個人設定將偏好設定精簡為通知設定，並保留淺色高對比規則", () => {
    const { rerender } = render(<Profile initialTab="preferences" />);

    expect(screen.getByTestId("profile-settings-page")).toHaveClass("profile-settings-page");
    expect(screen.getByText("啟用所有通知")).toBeInTheDocument();
    expect(screen.getByText("保存通知設定")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通知設定" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "偏好設定" })).not.toBeInTheDocument();
    expect(screen.queryByText("主題")).not.toBeInTheDocument();
    expect(screen.queryByText("語言")).not.toBeInTheDocument();
    expect(screen.queryByText("管理您的帳號資訊、偏好設定和安全設定")).not.toBeInTheDocument();
    const css = readFileSync("/home/ubuntu/qingshui-media-equipment/client/src/index.css", "utf8");
    expect(css).toContain("html:not(.dark) .profile-settings-page");
    expect(css).toContain("html:not(.dark) .profile-settings-page .text-gray-600");
    expect(css).toContain("html:not(.dark) .notification-settings-page");
    expect(css).toContain("html:not(.dark) .notification-settings-panel");
    expect(css).toContain(".notification-settings-page input[type=\"checkbox\"]");
    expect(css).toContain("html:not(.dark) .profile-security-section-navigation");
    expect(css).toContain("html:not(.dark) .profile-security-section-navigation .text-white");
    expect(css).toContain("html:not(.dark) .profile-security-settings-scope .bg-slate-950");
    expect(css).toContain("html:not(.dark) .profile-security-settings-scope .text-slate-300");
    expect(css).toContain("html:not(.dark) .profile-security-settings-scope .text-cyan-100");

    rerender(<Profile initialTab="security" securitySection="password" />);
    expect(screen.getByText("ACCOUNT SECURITY").parentElement?.parentElement).toHaveClass("profile-security-subpage-header");
  });
});
