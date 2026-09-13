import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Check, AlertCircle, ShieldCheck, Smartphone, MonitorX, KeyRound, Mail, Clock3, Copy, Printer, LockKeyhole, History, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { startRegistration } from "@simplewebauthn/browser";
import { assessPasswordStrength } from "@/lib/passwordStrength";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "wouter";

const AUDIT_PIN_SESSION_KEY = "qingshui-audit-pin-verified-at";
const PIN_VALIDITY_MS = 30 * 60 * 1000;

function hasValidAuditPinSession() {
  if (typeof window === "undefined") return false;
  const verifiedAt = Number(window.sessionStorage.getItem(AUDIT_PIN_SESSION_KEY));
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt < PIN_VALIDITY_MS;
}

function scrollToSecuritySection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

type SecuritySection = "password" | "two-factor" | "passkeys" | "devices";

const securitySectionLabels: Record<SecuritySection, string> = {
  password: "登入密碼",
  "two-factor": "雙因素與恢復",
  passkeys: "通行密鑰",
  devices: "設備與安全活動",
};

type ProfileProps = {
  initialTab?: "profile" | "preferences" | "security";
  securitySection?: SecuritySection;
};

export default function Profile({ initialTab = "profile", securitySection }: ProfileProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // 個人資料表單狀態
  const [profileForm, setProfileForm] = useState({
    realName: "",
    email: "",
    phone: "",
    department: "",
  });

  // 通知設定表單狀態
  const [preferencesForm, setPreferencesForm] = useState<{
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    borrowingNotifications: boolean;
  }>({
    notificationsEnabled: true,
    emailNotifications: false,
    borrowingNotifications: true,
  });

  // 密碼修改表單狀態
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ otpAuthUri: string; manualKey: string } | null>(null);
  const [disableTwoFactor, setDisableTwoFactor] = useState(false);
  const [recoveryCodePassword, setRecoveryCodePassword] = useState("");
  const [recoveryCodeTotp, setRecoveryCodeTotp] = useState("");
  const [visibleRecoveryCodes, setVisibleRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryCodesGeneratedAt, setRecoveryCodesGeneratedAt] = useState<Date | null>(null);
  const [recoveryRegenerationConfirmOpen, setRecoveryRegenerationConfirmOpen] = useState(false);
  const [recoveryCodesPrinted, setRecoveryCodesPrinted] = useState(false);
  const [recoveryCodesSafelyStored, setRecoveryCodesSafelyStored] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [passwordLogoutCountdown, setPasswordLogoutCountdown] = useState<number | null>(null);
  const [pendingIpBlockAlertId, setPendingIpBlockAlertId] = useState<number | null>(null);
  const [auditPinDialogOpen, setAuditPinDialogOpen] = useState(false);
  const [auditPinVerified, setAuditPinVerified] = useState(hasValidAuditPinSession);
  const [passkeyName, setPasskeyName] = useState("");
  const [editingPasskeyCredentialId, setEditingPasskeyCredentialId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");
  const utils = trpc.useUtils();

  // 獲取個人資料
  const { data: profileData, isLoading: profileLoading, error: profileError } = trpc.profile.getProfile.useQuery();

  // 獲取偏好設定
  const { data: preferencesData, error: preferencesError } = trpc.profile.getPreferences.useQuery();
  const { data: emailVerification, isLoading: emailVerificationLoading, refetch: refetchEmailVerification } = trpc.profile.emailVerificationStatus.useQuery();
  const { data: securityActivity, isLoading: securityActivityLoading, refetch: refetchSecurityActivity } = trpc.profile.securityActivity.useQuery();
  const { data: twoFactorStatus, isLoading: twoFactorLoading, refetch: refetchTwoFactor } = trpc.accountSecurity.twoFactorStatus.useQuery();
  const { data: recoveryCodeStatus, isLoading: recoveryCodeStatusLoading, error: recoveryCodeStatusError, refetch: refetchRecoveryCodeStatus } = trpc.accountSecurity.twoFactorRecoveryCodeStatus.useQuery();
  const { data: loginDevices, isLoading: devicesLoading, refetch: refetchDevices } = trpc.accountSecurity.devices.useQuery();
  const { data: passkeys, isLoading: passkeysLoading, refetch: refetchPasskeys } = trpc.accountSecurity.passkeys.useQuery();
  const { data: pendingDeviceAlerts, isLoading: deviceAlertsLoading, refetch: refetchDeviceAlerts } = trpc.profile.pendingDeviceAlerts.useQuery();
  const { data: passwordChangeStatus, refetch: refetchPasswordChangeStatus } = trpc.profile.passwordChangeStatus.useQuery();
  const { data: dynamicUserQrCode, isLoading: dynamicUserQrCodeLoading, refetch: refetchDynamicUserQrCode } = trpc.profile.dynamicUserQrCode.useQuery(undefined, { staleTime: 0, refetchOnWindowFocus: true });
  const [dynamicUserQrNow, setDynamicUserQrNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setDynamicUserQrNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dynamicUserQrCode?.expiresAt) return;
    const refreshDelay = Math.max(250, new Date(dynamicUserQrCode.expiresAt).getTime() - Date.now() + 250);
    const timeout = window.setTimeout(() => void refetchDynamicUserQrCode(), refreshDelay);
    return () => window.clearTimeout(timeout);
  }, [dynamicUserQrCode?.expiresAt, refetchDynamicUserQrCode]);

  const dynamicUserQrRemainingSeconds = dynamicUserQrCode?.expiresAt
    ? Math.max(0, Math.ceil((new Date(dynamicUserQrCode.expiresAt).getTime() - dynamicUserQrNow) / 1_000))
    : 0;
  const dynamicUserQrIsExpiring = dynamicUserQrRemainingSeconds > 0 && dynamicUserQrRemainingSeconds <= 30;
  const showSecuritySection = (section: SecuritySection) => securitySection === section;

  // 更新個人資料
  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("個人資料已更新");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  // 更新通知設定
  const updatePreferencesMutation = trpc.profile.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("通知設定已更新");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  // 修改密碼
  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密碼已修改");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      void refetchPasswordChangeStatus();
      setPasswordLogoutCountdown(5);
    },
    onError: (error) => {
      toast.error(error.message || "修改失敗");
    },
  });

  const beginTwoFactorMutation = trpc.customAuth.beginTwoFactorSetup.useMutation({
    onSuccess: (data) => {
      setTwoFactorSetup(data);
      setTwoFactorCode("");
      toast.info("請掃描 QR Code 並輸入驗證器 App 顯示的驗證碼");
    },
    onError: (error) => toast.error(error.message || "無法開始雙因素驗證設定"),
  });
  const confirmTwoFactorMutation = trpc.customAuth.confirmTwoFactorSetup.useMutation({
    onSuccess: async () => {
      setTwoFactorSetup(null);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      await refetchTwoFactor();
      toast.success("雙因素驗證已啟用");
    },
    onError: (error) => toast.error(error.message || "驗證碼錯誤"),
  });
  const disableTwoFactorMutation = trpc.customAuth.disableTwoFactor.useMutation({
    onSuccess: async () => {
      setTwoFactorPassword("");
      setTwoFactorCode("");
      setDisableTwoFactor(false);
      await refetchTwoFactor();
      toast.success("雙因素驗證已停用");
    },
    onError: (error) => toast.error(error.message || "無法停用雙因素驗證"),
  });
  const generateRecoveryCodesMutation = trpc.accountSecurity.generateTwoFactorRecoveryCodes.useMutation({
    onSuccess: async (data) => {
      setVisibleRecoveryCodes(data.codes);
      setRecoveryCodesGeneratedAt(new Date());
      setRecoveryCodesPrinted(false);
      setRecoveryCodesSafelyStored(false);
      setRecoveryCodePassword("");
      setRecoveryCodeTotp("");
      await Promise.all([refetchRecoveryCodeStatus(), refetchSecurityActivity()]);
      toast.success("新的備用恢復碼已產生，請立即安全保存");
    },
    onError: (error) => toast.error(error.message || "無法產生備用恢復碼"),
  });
  const confirmRecoveryCodesSafelyStoredMutation = trpc.accountSecurity.confirmTwoFactorRecoveryCodesSafelyStored.useMutation({
    onSuccess: async () => {
      setRecoveryCodesSafelyStored(true);
      await refetchSecurityActivity();
      toast.success("已記錄您確認安全保存恢復碼的操作");
    },
    onError: (error) => toast.error(error.message || "無法記錄保存確認，請稍後再試"),
  });
  const revokeDeviceMutation = trpc.accountSecurity.revokeDevice.useMutation({
    onSuccess: async (data) => {
      await refetchDevices();
      toast.success("登入設備已撤銷");
      if (data.revokedCurrentDevice) window.location.href = "/login";
    },
    onError: (error) => toast.error(error.message || "無法撤銷登入設備"),
  });
  const beginPasskeyRegistrationMutation = trpc.accountSecurity.beginPasskeyRegistration.useMutation();
  const finishPasskeyRegistrationMutation = trpc.accountSecurity.finishPasskeyRegistration.useMutation();
  const renamePasskeyMutation = trpc.accountSecurity.renamePasskey.useMutation({
    onSuccess: async () => {
      setEditingPasskeyCredentialId(null);
      setEditingPasskeyName("");
      await Promise.all([refetchPasskeys(), refetchSecurityActivity()]);
      toast.success("通行密鑰名稱已更新");
    },
    onError: (error) => toast.error(error.message || "無法更新通行密鑰名稱"),
  });
  const deletePasskeyMutation = trpc.accountSecurity.deletePasskey.useMutation({
    onSuccess: async (data) => {
      await Promise.all([refetchPasskeys(), refetchSecurityActivity()]);
      toast.success(data.emailNotification === "sent" ? "通行密鑰已移除，安全通知信已寄送" : "通行密鑰已移除");
      if (data.emailNotification === "email_unverified") toast.info("請先驗證電子郵件，以接收通行密鑰安全通知");
    },
    onError: (error) => toast.error(error.message || "無法移除通行密鑰"),
  });
  const confirmDeviceAlertMutation = trpc.profile.confirmDeviceAlert.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchDeviceAlerts(), refetchDevices()]);
      toast.success("已確認此登入設備為您本人使用");
    },
    onError: (error) => toast.error(error.message || "無法確認未知設備"),
  });
  const revokeDeviceAlertMutation = trpc.profile.revokeDeviceAlert.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchDeviceAlerts(), refetchDevices()]);
      toast.success("未知設備已撤銷，該設備後續請求將失效");
    },
    onError: (error) => toast.error(error.message || "無法撤銷未知設備"),
  });
  const verifyAuditPinMutation = trpc.auditPin.verify.useMutation();
  const blockHighRiskDeviceIpMutation = trpc.profile.blockHighRiskDeviceIp.useMutation({
    onSuccess: async ({ ipAddress }) => {
      setPendingIpBlockAlertId(null);
      await Promise.all([refetchDeviceAlerts(), refetchDevices()]);
      toast.success(`已封鎖 ${ipAddress} 並撤銷可疑設備`);
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED" || error.message.includes("PIN 碼驗證失效")) {
        window.sessionStorage.removeItem(AUDIT_PIN_SESSION_KEY);
        setAuditPinVerified(false);
        setAuditPinDialogOpen(true);
      }
      toast.error(error.message || "無法封鎖可疑設備 IP");
    },
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
    onError: () => toast.error("登出失敗，請手動重新登入"),
  });

  const handleAddPasskey = async () => {
    const normalizedName = passkeyName.trim();
    if (!normalizedName) {
      toast.error("請先為此通行密鑰命名，例如「我的 iPhone」");
      return;
    }
    if (!window.PublicKeyCredential) {
      toast.error("此瀏覽器不支援通行密鑰，請改用支援 Face ID、Touch ID 或裝置解鎖的瀏覽器");
      return;
    }
    try {
      const options = await beginPasskeyRegistrationMutation.mutateAsync({ name: normalizedName });
      const response = await startRegistration({ optionsJSON: options });
      const result = await finishPasskeyRegistrationMutation.mutateAsync({ response: response as any });
      setPasskeyName("");
      await Promise.all([refetchPasskeys(), refetchSecurityActivity()]);
      toast.success(result.emailNotification === "sent" ? "通行密鑰已新增，安全通知信已寄送" : "通行密鑰已新增，可在下次登入時使用");
      if (result.emailNotification === "email_unverified") toast.info("請先驗證電子郵件，以接收通行密鑰安全通知");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const message = error instanceof Error ? error.message : "";
      toast.error(name === "NotAllowedError" ? "已取消通行密鑰設定" : message || "無法新增通行密鑰，請重新嘗試");
    }
  };
  const sendEmailVerificationMutation = trpc.profile.sendEmailVerification.useMutation({
    onSuccess: async () => {
      await refetchEmailVerification();
      toast.success("驗證碼已寄送至您的電子郵件");
    },
    onError: (error) => toast.error(error.message || "驗證碼寄送失敗"),
  });
  const verifyEmailMutation = trpc.profile.verifyEmail.useMutation({
    onSuccess: async () => {
      setEmailVerificationCode("");
      await refetchEmailVerification();
      toast.success("電子郵件已完成驗證");
    },
    onError: (error) => toast.error(error.message || "驗證碼不正確"),
  });

  useEffect(() => {
    setResendCooldownSeconds(emailVerification?.resendAvailableInSeconds ?? 0);
  }, [emailVerification?.resendAvailableInSeconds]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendCooldownSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (passwordLogoutCountdown === null) return;
    if (passwordLogoutCountdown <= 0) {
      logoutMutation.mutate();
      return;
    }
    const timer = window.setTimeout(() => setPasswordLogoutCountdown((seconds) => seconds === null ? null : seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [passwordLogoutCountdown]);

  // 初始化個人資料表單
  useEffect(() => {
    if (profileData?.user) {
      setProfileForm({
        realName: profileData.user.realName || "",
        email: profileData.user.email || "",
        phone: profileData.user.phone || "",
        department: profileData.user.department || "",
      });
    }
  }, [profileData?.user]);

  // 初始化通知設定表單
  useEffect(() => {
    if (preferencesData) {
      setPreferencesForm({
        notificationsEnabled: preferencesData.notificationsEnabled ?? true,
        emailNotifications: preferencesData.emailNotifications ?? false,
        borrowingNotifications: preferencesData.borrowingNotifications ?? true,
      });
    }
  }, [preferencesData]);

  const handleProfileSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfileMutation.mutateAsync(profileForm);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSubmit = async () => {
    setIsLoading(true);
    try {
      await updatePreferencesMutation.mutateAsync(preferencesForm);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("新密碼與確認密碼不符");
      return;
    }
    setIsLoading(true);
    try {
      await changePasswordMutation.mutateAsync(passwordForm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBeginTwoFactor = () => {
    if (!twoFactorPassword) return toast.error("請先輸入目前密碼");
    beginTwoFactorMutation.mutate({ password: twoFactorPassword });
  };

  const handleConfirmTwoFactor = () => {
    if (twoFactorCode.length !== 6) return toast.error("請輸入六位數驗證碼");
    confirmTwoFactorMutation.mutate({ code: twoFactorCode });
  };

  const handleDisableTwoFactor = () => {
    if (!twoFactorPassword || twoFactorCode.length !== 6) return toast.error("請輸入目前密碼與六位數驗證碼");
    disableTwoFactorMutation.mutate({ password: twoFactorPassword, code: twoFactorCode });
  };
  const handleGenerateRecoveryCodes = () => {
    if (!recoveryCodePassword || recoveryCodeTotp.length !== 6) return toast.error("請輸入目前密碼與六位數驗證器碼");
    if ((recoveryCodeStatus?.availableCount ?? 0) > 0) {
      setRecoveryRegenerationConfirmOpen(true);
      return;
    }
    generateRecoveryCodesMutation.mutate({ password: recoveryCodePassword, code: recoveryCodeTotp });
  };

  const confirmRecoveryCodeRegeneration = () => {
    setRecoveryRegenerationConfirmOpen(false);
    generateRecoveryCodesMutation.mutate({ password: recoveryCodePassword, code: recoveryCodeTotp });
  };

  const printRecoveryCodes = () => {
    if (!visibleRecoveryCodes?.length) return;
    const styleId = "recovery-code-print-isolation";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = "@media print { body * { visibility: hidden !important; } .recovery-code-print-sheet, .recovery-code-print-sheet * { visibility: visible !important; } .recovery-code-print-sheet { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; margin: 0 !important; } }";
    document.head.appendChild(style);
    const cleanup = () => document.getElementById(styleId)?.remove();
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
    setRecoveryCodesPrinted(true);
    window.setTimeout(() => window.print(), 0);
  };
  const newPasswordStrength = assessPasswordStrength(passwordForm.newPassword);

  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">無法載入個人資料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-settings-page space-y-6" data-testid="profile-settings-page">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">個人設定</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => { if (value === "profile" || value === "preferences" || value === "security") setActiveTab(value); }} className="w-full">
        <TabsList className="profile-settings-tab-list grid w-full grid-cols-3 border-2 border-gray-800">
          <TabsTrigger value="profile" className="profile-settings-tab-trigger font-bold">
            個人設定
          </TabsTrigger>
          <TabsTrigger value="preferences" className="profile-settings-tab-trigger font-bold">
            通知設定
          </TabsTrigger>
          <TabsTrigger value="security" className="profile-settings-tab-trigger font-bold">
            安全設定
          </TabsTrigger>
        </TabsList>

        {/* 個人資料標籤 */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-2 border-gray-800 p-6" data-testid="profile-user-qr-code">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit border-2 border-gray-800 bg-white p-3">
                {dynamicUserQrCode?.value ? <QRCodeSVG value={dynamicUserQrCode.value} size={156} level="H" /> : <Loader2 className="h-8 w-8 animate-spin" />}
              </div>
              <div className="min-w-0 space-y-2">
                <h2 className="font-black">我的使用者 QR Code</h2>
                <p className="text-sm text-gray-600">此 QR Code 使用伺服器簽章與短效識別，不會揭露姓名、電子郵件或其他個人資料</p>
                <div className={`flex flex-col gap-2 border px-3 py-2 text-xs font-bold sm:flex-row sm:items-center sm:justify-between ${dynamicUserQrIsExpiring ? "border-amber-500 bg-amber-50 text-amber-950" : "border-sky-300 bg-sky-50 text-sky-950"}`} role="status" aria-live="polite" data-testid="profile-user-qr-countdown">
                  <span>{dynamicUserQrCodeLoading ? "正在取得安全 QR Code…" : dynamicUserQrIsExpiring ? `即將到期：安全 QR Code 剩餘 ${dynamicUserQrRemainingSeconds} 秒` : dynamicUserQrRemainingSeconds > 0 ? `安全 QR Code 將於 ${dynamicUserQrRemainingSeconds} 秒後自動更新` : "安全 QR Code 正在更新…"}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => void refetchDynamicUserQrCode()} disabled={dynamicUserQrCodeLoading} className="h-8 border-current bg-white/70 text-inherit hover:bg-white">立即更新</Button>
                </div>
                <p className="text-xs text-gray-500">請在使用時開啟本頁掃描，避免截圖、列印或轉傳給他人；QR Code 每 5 分鐘自動失效</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 border-2 border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">帳號名稱</label>
                <Input
                  value={profileData?.user?.username || ""}
                  disabled
                  className="border-2 border-gray-800 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">帳號名稱無法修改</p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">真實姓名</label>
                <Input
                  value={profileForm.realName}
                  onChange={(e) => setProfileForm({ ...profileForm, realName: e.target.value })}
                  placeholder="輸入真實姓名"
                  className="border-2 border-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">電子郵件</label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="輸入電子郵件"
                  className="border-2 border-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">電話</label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="輸入電話號碼"
                  className="border-2 border-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">班級/部門</label>
                <Input
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  placeholder="輸入班級或部門"
                  className="border-2 border-gray-800"
                />
              </div>

              <Button
                onClick={handleProfileSubmit}
                disabled={isLoading || updateProfileMutation.isPending}
                className="w-full bg-gray-900 text-white border-2 border-gray-800 font-bold hover:bg-gray-800"
              >
                {isLoading || updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    保存個人資料
                  </>
                )}
              </Button>
            </div>
          </Card>
          <Card className="p-6 border-2 border-gray-800">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-black">聯絡資料驗證</h2>
                    <p className="text-sm text-gray-600">驗證後可確認您的聯絡電子郵件為可使用狀態</p>
                  </div>
                  {emailVerification?.verified ? <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800"><Check className="h-3.5 w-3.5" />電子郵件已驗證</span> : <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800"><AlertCircle className="h-3.5 w-3.5" />尚未驗證</span>}
                </div>
                {!emailVerification?.email ? (
                  <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">請先填寫並儲存電子郵件地址，再寄送驗證碼</p>
                ) : profileForm.email.trim() !== emailVerification.email ? (
                  <p className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">您已變更電子郵件地址，請先儲存個人資料後再進行驗證</p>
                ) : emailVerification.verified ? (
                  <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">已驗證：{emailVerification.email}{emailVerification.verifiedAt ? `（${new Date(emailVerification.verifiedAt).toLocaleString()}）` : ""}</p>
                ) : (
                  <div className="space-y-3 rounded border border-gray-300 p-3">
                    <p className="text-sm">驗證碼將寄至 <strong>{emailVerification.email}</strong>，有效期限為 10 分鐘，最多可輸入 {emailVerification.remainingAttempts} 次</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" onClick={() => sendEmailVerificationMutation.mutate()} disabled={emailVerificationLoading || sendEmailVerificationMutation.isPending || resendCooldownSeconds > 0}>
                        {sendEmailVerificationMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        {resendCooldownSeconds > 0 ? `可於 ${resendCooldownSeconds} 秒後重送` : "寄送驗證碼"}
                      </Button>
                      {emailVerification.pending && <div className="flex flex-1 gap-2"><Input aria-label="電子郵件驗證碼" inputMode="numeric" maxLength={6} placeholder="輸入六位數驗證碼" value={emailVerificationCode} onChange={(event) => setEmailVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /><Button onClick={() => verifyEmailMutation.mutate({ code: emailVerificationCode })} disabled={emailVerificationCode.length !== 6 || verifyEmailMutation.isPending}>{verifyEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認驗證"}</Button></div>}
                    </div>
                    {resendCooldownSeconds > 0 && <div aria-label="驗證碼重送冷卻進度" className="space-y-1"><div className="h-1.5 overflow-hidden bg-gray-200"><div className="h-full origin-left bg-amber-500 transition-transform duration-200" style={{ transform: `scaleX(${resendCooldownSeconds / 60})` }} /></div><p className="text-xs text-amber-800">為避免重複寄送，請等待 {resendCooldownSeconds} 秒</p></div>}
                    {emailVerification.pending && emailVerification.expiresAt && <p className="flex items-center gap-1 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" />驗證碼於 {new Date(emailVerification.expiresAt).toLocaleTimeString()} 前有效</p>}
                  </div>
                )}
                <p className="text-xs text-gray-500">電話驗證需要已設定的 SMS 發送服務；目前系統尚未連接 SMS 供應商，因此尚無法傳送手機驗證碼</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 通知設定標籤 */}
        <TabsContent value="preferences" className="notification-settings-page space-y-4" data-testid="notification-settings-page">
          <Card className="p-6 border-2 border-gray-800" data-testid="notification-settings-card">
            {preferencesError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                無法載入偏好設定
              </div>
            )}
            <div className="space-y-4">
              <div className="notification-settings-panel space-y-3 border-2 border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-sm">通知設定</h3>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.notificationsEnabled}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, notificationsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 border-2 border-gray-800"
                  />
                  <span className="text-sm">啟用所有通知</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.emailNotifications}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, emailNotifications: e.target.checked })
                    }
                    className="w-4 h-4 border-2 border-gray-800"
                  />
                  <span className="text-sm">電子郵件通知</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.borrowingNotifications}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, borrowingNotifications: e.target.checked })
                    }
                    className="w-4 h-4 border-2 border-gray-800"
                  />
                  <span className="text-sm">借用相關通知</span>
                </label>
              </div>

              <Button
                onClick={handlePreferencesSubmit}
                disabled={isLoading || updatePreferencesMutation.isPending}
                className="w-full bg-gray-900 text-white border-2 border-gray-800 font-bold hover:bg-gray-800"
              >
                {isLoading || updatePreferencesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    保存通知設定
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* 安全設定標籤 */}
        <TabsContent value="security" className="profile-security-settings-scope space-y-4">
          {!securitySection ? <section className="profile-security-section-navigation border-2 border-slate-800 bg-slate-950 p-4 text-white sm:p-5" aria-labelledby="security-section-navigation-title" data-testid="security-section-navigation">
            <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-cyan-200">ACCOUNT SECURITY</p>
            <h2 id="security-section-navigation-title" className="mt-1 text-xl font-black">安全設定</h2>
            <div className="mt-4 grid grid-cols-1 gap-2" data-testid="security-section-links">
              {[
                { id: "password", icon: LockKeyhole, title: "登入密碼", description: "變更您的登入密碼" },
                { id: "two-factor", icon: ShieldCheck, title: "雙因素與恢復", description: "驗證器、備用恢復碼與安全保存" },
                { id: "passkeys", icon: KeyRound, title: "通行密鑰", description: "管理 Face ID、Touch ID 與裝置解鎖登入" },
                { id: "devices", icon: History, title: "設備與安全活動", description: "檢視登入設備、未知設備警告與異動歷史" },
              ].map(({ id, icon: Icon, title, description }) => (
                <Link key={id} href={`/profile/security/${id}`} className="group flex min-h-20 items-center gap-3 border border-slate-600 bg-slate-900 px-4 text-left transition hover:border-cyan-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-300/50 bg-cyan-300/10 text-cyan-100"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-bold text-white">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-300">{description}</span></span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-cyan-200 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section> : <div className="profile-security-subpage-header flex flex-col gap-3 border-2 border-slate-800 bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-mono text-[11px] font-bold tracking-[0.16em] text-cyan-200">ACCOUNT SECURITY</p><nav aria-label="安全設定麵包屑導覽" className="mt-2 overflow-x-auto"><ol className="flex min-w-max items-center gap-1.5 text-xs text-slate-300"><li><Link href="/profile" className="transition hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">個人設定</Link></li><li aria-hidden="true" className="text-slate-500">/</li><li><Link href="/profile/security" className="transition hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">安全設定</Link></li><li aria-hidden="true" className="text-slate-500">/</li><li><span aria-current="page" className="font-bold text-cyan-100">{securitySectionLabels[securitySection]}</span></li></ol></nav></div><Link href="/profile/security" aria-label="返回上一頁：安全設定總覽" className="inline-flex w-fit items-center gap-1.5 border border-cyan-200/70 px-3 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"><ChevronLeft className="h-4 w-4" aria-hidden="true" />返回上一頁</Link></div>}
          {showSecuritySection("password") && <div id="security-password" className="login-password-security-page scroll-mt-5">
            <div className="px-1 pb-2"><p className="font-mono text-[11px] font-bold tracking-[0.16em] text-slate-500">LOGIN PASSWORD</p><h2 className="mt-1 text-lg font-black">登入密碼</h2></div>
          <Card className="login-password-security-card p-6 border-2 border-gray-800">
            <div className="space-y-4">
              {/* 密碼更換週期仍持續於背景判定與提醒，但依需求不在安全設定前端顯示 */}

              <div>
                <label className="block text-sm font-bold mb-2">目前密碼</label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="輸入目前密碼"
                  className="border-2 border-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">新密碼</label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="輸入新密碼"
                  className="border-2 border-gray-800"
                />
                <div aria-live="polite" className="mt-2 rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm"><span className="font-bold">密碼強度</span><span className={`font-bold ${newPasswordStrength.level === "strong" ? "text-emerald-700" : newPasswordStrength.level === "medium" ? "text-amber-700" : "text-red-700"}`}>{newPasswordStrength.label}</span></div>
                  <div role="progressbar" aria-label="密碼強度" aria-valuemin={0} aria-valuemax={5} aria-valuenow={newPasswordStrength.score} className="mt-2 h-2 overflow-hidden bg-gray-200"><div className={`h-full origin-left transition-transform duration-200 ${newPasswordStrength.level === "strong" ? "bg-emerald-500" : newPasswordStrength.level === "medium" ? "bg-amber-500" : "bg-red-500"}`} style={{ transform: `scaleX(${newPasswordStrength.score / 5})` }} /></div>
                  {newPasswordStrength.level !== "strong" && <p className="mt-2 text-xs text-gray-600">{newPasswordStrength.suggestions.slice(0, 2).join("；")}</p>}
                  {newPasswordStrength.validByPolicy && newPasswordStrength.level !== "strong" && <p className="mt-1 text-xs text-emerald-700">已符合目前最低密碼規則，仍建議增加長度、數字或符號</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">確認新密碼</label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="再次輸入新密碼"
                  className="border-2 border-gray-800"
                />
              </div>

              <Button
                onClick={handlePasswordSubmit}
                disabled={isLoading || changePasswordMutation.isPending}
                className="login-password-security-submit w-full bg-gray-900 text-white border-2 border-gray-800 font-bold hover:bg-gray-800"
              >
                {isLoading || changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    修改密碼
                  </>
                )}
              </Button>
              {passwordLogoutCountdown !== null && <div role="alert" className="flex flex-col gap-3 border-2 border-emerald-500 bg-emerald-50 p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">密碼已更新成功</p><p className="text-sm">下次登入請使用新密碼為保護帳號，系統將於 {passwordLogoutCountdown} 秒後自動登出</p></div><Button size="sm" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>立即重新登入</Button></div>}
            </div>
          </Card>
          </div>}

          {showSecuritySection("two-factor") && <div id="security-two-factor" className="scroll-mt-5 space-y-4"><div className="px-1 pb-0"><p className="font-mono text-[11px] font-bold tracking-[0.16em] text-slate-500">02 · TWO-FACTOR & RECOVERY</p><h2 className="mt-1 text-lg font-black">雙因素與恢復</h2></div>
          <Card className="p-6 border-2 border-gray-800">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h3 className="flex items-center gap-2 font-black"><ShieldCheck className="w-5 h-5" />雙因素驗證（2FA）</h3><p className="mt-1 text-xs text-gray-600">使用驗證器 App 的六位數一次性驗證碼保護帳號登入</p></div>
              <span className={`shrink-0 border-2 px-2 py-1 text-xs font-bold ${twoFactorStatus?.enabled ? "border-green-600 bg-green-50 text-green-800" : "border-gray-400 bg-gray-100 text-gray-700"}`}>{twoFactorStatus?.enabled ? "已啟用" : "未啟用"}</span>
            </div>
            {twoFactorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : twoFactorSetup ? (
              <div className="space-y-4 border-t-2 border-gray-200 pt-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="w-fit border-2 border-gray-800 bg-white p-3"><QRCodeSVG value={twoFactorSetup.otpAuthUri} size={156} /></div><div className="space-y-2 text-sm"><p className="font-bold">掃描 QR Code 後輸入驗證碼確認</p><p className="text-xs text-gray-600">手動密鑰（僅此設定期間顯示）：</p><code className="block break-all bg-gray-100 p-2 text-xs">{twoFactorSetup.manualKey}</code></div></div>
                <Input inputMode="numeric" maxLength={6} placeholder="六位數驗證碼" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="border-2 border-gray-800 font-mono tracking-[0.3em]" />
                <div className="flex gap-3"><Button onClick={handleConfirmTwoFactor} disabled={twoFactorCode.length !== 6 || confirmTwoFactorMutation.isPending} className="bg-gray-900 text-white border-2 border-gray-800">{confirmTwoFactorMutation.isPending ? "確認中..." : "確認並啟用 2FA"}</Button><Button variant="outline" onClick={() => { setTwoFactorSetup(null); setTwoFactorCode(""); }}>取消</Button></div>
              </div>
            ) : twoFactorStatus?.enabled ? (
              <div className="space-y-3 border-t-2 border-gray-200 pt-4"><p className="text-sm text-green-800">此帳號在每次登入時都必須輸入驗證器 App 的驗證碼</p>{!disableTwoFactor ? <Button variant="outline" onClick={() => setDisableTwoFactor(true)} className="border-red-600 text-red-700 hover:bg-red-50">停用雙因素驗證</Button> : <div className="space-y-3 border-2 border-red-300 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">停用前請再次驗證身分</p><Input type="password" placeholder="目前密碼" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} className="border-2 border-gray-800" /><Input inputMode="numeric" maxLength={6} placeholder="六位數驗證碼" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="border-2 border-gray-800 font-mono tracking-[0.3em]" /><div className="flex gap-3"><Button onClick={handleDisableTwoFactor} disabled={disableTwoFactorMutation.isPending} className="bg-red-700 text-white">{disableTwoFactorMutation.isPending ? "停用中..." : "確認停用"}</Button><Button variant="outline" onClick={() => { setDisableTwoFactor(false); setTwoFactorCode(""); }}>取消</Button></div></div>}</div>
            ) : (
              <div className="space-y-3 border-t-2 border-gray-200 pt-4"><p className="text-sm text-gray-700">啟用後，密碼正確仍需通過驗證器 App 的一次性驗證碼，才能完成登入</p><Input type="password" placeholder="輸入目前密碼以開始設定" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} className="border-2 border-gray-800" /><Button onClick={handleBeginTwoFactor} disabled={!twoFactorPassword || beginTwoFactorMutation.isPending} className="bg-gray-900 text-white border-2 border-gray-800">{beginTwoFactorMutation.isPending ? "準備中..." : "設定雙因素驗證"}</Button></div>
            )}
          </Card>

          {twoFactorStatus?.enabled && !recoveryCodeStatusLoading && !recoveryCodeStatusError && (recoveryCodeStatus?.availableCount ?? 0) < 3 && <Card className="border-2 border-amber-700 bg-amber-50 p-5 text-amber-950" role="alert" aria-label="備用恢復碼低庫存提醒"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><div><h3 className="font-black">備用恢復碼即將用盡</h3><p className="mt-1 text-sm">目前僅剩 <strong>{recoveryCodeStatus?.availableCount ?? 0}</strong> 組未使用恢復碼建議立即重新產生；系統會撤銷所有舊碼，並提供新的安全保存版</p></div></div></Card>}

          {twoFactorStatus?.enabled && <Card className="border-2 border-sky-700 bg-sky-50 p-6" aria-labelledby="two-factor-recovery-code-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><h3 id="two-factor-recovery-code-title" className="flex items-center gap-2 font-black text-sky-950"><KeyRound className="h-5 w-5" />備用恢復碼</h3><p className="mt-1 text-xs text-sky-900">驗證器裝置無法使用時，可改用一組恢復碼登入；每組僅限使用一次</p></div>
              <span className="w-fit shrink-0 border-2 border-sky-700 bg-white px-2 py-1 text-xs font-bold text-sky-950">{recoveryCodeStatusLoading ? "載入中" : `可用 ${recoveryCodeStatus?.availableCount ?? 0} 組`}</span>
            </div>
            {visibleRecoveryCodes ? <div className="mt-4 space-y-4 border-2 border-sky-700 bg-white p-4" role="status" aria-live="polite"><div><p className="font-bold text-sky-950">請立即保存這些恢復碼</p><p className="mt-1 text-sm text-sky-900">基於安全設計，關閉此區塊後系統無法再次顯示同一批明碼請儲存於可信任的密碼管理工具或離線安全位置，勿與他人分享</p></div><div className="grid gap-2 sm:grid-cols-2" aria-label="新產生的 2FA 備用恢復碼">{visibleRecoveryCodes.map((code) => <code key={code} className="border border-sky-300 bg-sky-50 px-3 py-2 text-center text-sm font-bold tracking-[0.16em] text-sky-950">{code}</code>)}</div><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(visibleRecoveryCodes.join("\n")); toast.success("恢復碼已複製，請貼到安全位置保存"); } catch { toast.error("無法自動複製，請手動保存恢復碼"); } }} className="border-sky-700 text-sky-950 hover:bg-sky-100"><Copy className="mr-2 h-4 w-4" />複製全部恢復碼</Button><Button onClick={() => setVisibleRecoveryCodes(null)} className="border-2 border-sky-900 bg-sky-900 text-white hover:bg-sky-800">我已安全保存，關閉明碼</Button></div></div> : recoveryCodeStatusError ? <div className="mt-4 flex flex-col gap-3 border-2 border-red-400 bg-red-50 p-4 text-red-950" role="alert"><div><p className="font-bold">無法載入恢復碼狀態</p><p className="mt-1 text-sm">為避免誤判可用組數，請重新載入後再產生或重設恢復碼</p></div><Button variant="outline" className="w-fit border-red-700 text-red-900 hover:bg-red-100" onClick={() => void refetchRecoveryCodeStatus()}>重新載入</Button></div> : <div className="mt-4 space-y-3 border-t-2 border-sky-200 pt-4"><p className="text-sm text-sky-950">{recoveryCodeStatus?.availableCount ? `目前尚有 ${recoveryCodeStatus.availableCount} 組可用恢復碼重新產生會立即撤銷所有未使用的舊恢復碼` : "您尚未產生恢復碼；建議現在建立，以免遺失驗證器後無法登入"}</p><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-bold text-sky-950">目前密碼</label><Input aria-label="恢復碼目前密碼" type="password" value={recoveryCodePassword} onChange={(event) => setRecoveryCodePassword(event.target.value)} placeholder="輸入目前密碼" className="border-2 border-sky-700 bg-white" /></div><div><label className="mb-2 block text-sm font-bold text-sky-950">驗證器六位數碼</label><Input aria-label="恢復碼驗證器六位數碼" inputMode="numeric" maxLength={6} value={recoveryCodeTotp} onChange={(event) => setRecoveryCodeTotp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="border-2 border-sky-700 bg-white font-mono tracking-[0.22em]" /></div></div><Button onClick={handleGenerateRecoveryCodes} disabled={!recoveryCodePassword || recoveryCodeTotp.length !== 6 || generateRecoveryCodesMutation.isPending} className="border-2 border-sky-900 bg-sky-900 text-white hover:bg-sky-800">{generateRecoveryCodesMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />產生中…</> : <><KeyRound className="mr-2 h-4 w-4" />{recoveryCodeStatus?.availableCount ? "重新產生並撤銷舊恢復碼" : "產生 10 組備用恢復碼"}</>}</Button></div>}
          </Card>}

          {twoFactorStatus?.enabled && <Card className="border-2 border-slate-700 bg-slate-50 p-6" aria-labelledby="recovery-code-print-title">
            <div><h3 id="recovery-code-print-title" className="flex items-center gap-2 font-black text-slate-950"><Printer className="h-5 w-5" />恢復碼安全保存與列印</h3><p className="mt-1 text-xs text-slate-700">列印版僅會在本次產生恢復碼後顯示，且不會將明碼另存至系統</p></div>
            <div className="mt-4 border-l-4 border-slate-700 bg-white p-4 text-sm text-slate-900"><p className="font-bold">安全保存與使用注意事項</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-700"><li>每組恢復碼僅能使用一次，使用後請在紙本上劃記或銷毀該組</li><li>請存放於上鎖位置或可信任的密碼管理工具；請勿拍照、傳送訊息或與他人共用</li><li>若遺失列印頁、懷疑遭他人取得，請立即重新產生，系統會撤銷所有舊碼</li></ol></div>
            {visibleRecoveryCodes ? <><div className="mt-4 flex flex-wrap gap-2 print-hidden"><Button onClick={printRecoveryCodes} className="border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-800"><Printer className="mr-2 h-4 w-4" />列印安全保存版</Button><p className="self-center text-xs text-slate-600">列印前請確認周邊無人可見，完成後妥善收存</p></div><section className="recovery-code-print-sheet mt-5" aria-label="2FA 備用恢復碼列印版"><header className="recovery-code-print-header"><BrandLogo className="recovery-code-print-logo h-12 w-12" /><div><p className="recovery-code-print-kicker">QINGSHUI MEDIA SERVICE · ACCOUNT SECURITY</p><h2>2FA 備用恢復碼安全保存版</h2><p>產生時間：{(recoveryCodesGeneratedAt ?? new Date()).toLocaleString("zh-TW")}</p></div></header><div className="recovery-code-print-grid">{visibleRecoveryCodes.map((code, index) => <div key={code} className="recovery-code-print-card"><span>恢復碼 {String(index + 1).padStart(2, "0")}</span><code>{code}</code><small>使用後請劃記或銷毀</small></div>)}</div><aside className="recovery-code-print-notes"><h3>安全提醒</h3><ol><li>每組僅限使用一次；輸入成功後即失效</li><li>勿以照片、雲端筆記或即時訊息保存本頁內容</li><li>列印遺失或疑似外流時，立即於帳號安全設定重新產生恢復碼</li></ol></aside><footer>清水高中媒體服務隊管理系統 · 僅供帳號持有人安全保存</footer></section></> : <p className="mt-4 text-sm text-slate-700">請先在上方完成密碼與驗證器碼確認並產生恢復碼，系統才會顯示可列印的專屬排版</p>}
          </Card>}
          {visibleRecoveryCodes && recoveryCodesPrinted && <Card className="border-2 border-emerald-700 bg-emerald-50 p-5 text-emerald-950 print-hidden" role="status" aria-live="polite"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 font-black"><Check className="h-5 w-5" />列印後安全保存確認</h3><p className="mt-1 text-sm">確認紙本或離線保存版已收存後，系統會將此確認寫入您的帳號安全活動日誌；不會記錄任何恢復碼明碼</p></div>{recoveryCodesSafelyStored ? <span className="border-2 border-emerald-700 bg-white px-3 py-2 text-sm font-bold">已記錄安全保存確認</span> : <Button onClick={() => confirmRecoveryCodesSafelyStoredMutation.mutate({ displayedCodeCount: visibleRecoveryCodes.length })} disabled={confirmRecoveryCodesSafelyStoredMutation.isPending} className="border-2 border-emerald-900 bg-emerald-900 text-white hover:bg-emerald-800">{confirmRecoveryCodesSafelyStoredMutation.isPending ? "記錄中…" : "已安全保存"}</Button>}</div></Card>}

          </div>}

          {showSecuritySection("passkeys") && <div id="security-passkeys" className="scroll-mt-5"><div className="px-1 pb-2"><p className="font-mono text-[11px] font-bold tracking-[0.16em] text-slate-500">03 · PASSKEY ACCESS</p><h2 className="mt-1 text-lg font-black">通行密鑰</h2></div>
          <Card className="p-6 border-2 border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="flex items-center gap-2 font-black"><KeyRound className="w-5 h-5" />通行密鑰</h3><p className="mt-1 text-xs text-gray-600">以 Face ID、Touch ID 或裝置解鎖方式登入；系統不會取得或保存您的生物特徵資料</p></div><span className="w-fit shrink-0 border-2 border-sky-700 bg-sky-50 px-2 py-1 text-xs font-bold text-sky-900">{passkeys?.length || 0} 組</span></div>
            <div className="mt-4 border-t-2 border-gray-200 pt-4"><div className="flex flex-col gap-3 sm:flex-row"><Input value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} maxLength={128} placeholder="名稱，例如：我的 iPhone" className="border-2 border-gray-800" /><Button onClick={handleAddPasskey} disabled={!passkeyName.trim() || beginPasskeyRegistrationMutation.isPending || finishPasskeyRegistrationMutation.isPending} className="shrink-0 border-2 border-gray-800 bg-gray-900 text-white hover:bg-gray-800">{beginPasskeyRegistrationMutation.isPending || finishPasskeyRegistrationMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />設定中…</> : <><KeyRound className="mr-2 h-4 w-4" />新增通行密鑰</>}</Button></div><p className="mt-2 text-xs text-gray-600">請在自己的受信任裝置上設定；建議至少保留一組其他登入方式，以避免裝置遺失時無法登入</p></div>
            <div className="mt-4 space-y-3">
              {passkeysLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : !passkeys?.length ? <p className="border-2 border-dashed border-gray-300 p-4 text-sm text-gray-600">尚未設定通行密鑰</p> : passkeys.map((passkey) => (
                <div key={passkey.credentialId} className="flex flex-col gap-3 border-2 border-gray-800 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    {editingPasskeyCredentialId === passkey.credentialId ? <div className="flex flex-col gap-2 sm:flex-row"><Input value={editingPasskeyName} maxLength={128} onChange={(event) => setEditingPasskeyName(event.target.value)} className="border-2 border-gray-800" /><Button size="sm" onClick={() => renamePasskeyMutation.mutate({ credentialId: passkey.credentialId, name: editingPasskeyName.trim() })} disabled={!editingPasskeyName.trim() || renamePasskeyMutation.isPending}>儲存</Button><Button size="sm" variant="outline" onClick={() => { setEditingPasskeyCredentialId(null); setEditingPasskeyName(""); }}>取消</Button></div> : <>
                      <p className="font-bold">{passkey.name}</p>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-600">
                        <dt className="font-semibold text-gray-800">註冊裝置</dt><dd>{passkey.registeredDeviceLabel || "未記錄（舊有憑證）"}</dd>
                        <dt className="font-semibold text-gray-800">最近使用</dt><dd>{passkey.lastUsedAt ? new Date(passkey.lastUsedAt).toLocaleString("zh-TW") : "尚未使用"}</dd>
                        <dt className="font-semibold text-gray-800">憑證類型</dt><dd>{passkey.deviceType === "multiDevice" ? "可同步通行密鑰" : "單一裝置通行密鑰"}{passkey.backedUp ? " · 已啟用備份" : ""}</dd>
                      </dl>
                    </>}
                  </div>
                  {editingPasskeyCredentialId !== passkey.credentialId && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingPasskeyCredentialId(passkey.credentialId); setEditingPasskeyName(passkey.name); }}>重新命名</Button><Button size="sm" variant="outline" className="border-red-600 text-red-700 hover:bg-red-50" onClick={() => { if (window.confirm(`確定要移除「${passkey.name}」嗎？`)) deletePasskeyMutation.mutate({ credentialId: passkey.credentialId }); }} disabled={deletePasskeyMutation.isPending}>移除</Button></div>}
                </div>
              ))}
            </div>
          </Card>

          </div>}

          {showSecuritySection("devices") && <div id="security-devices" className="scroll-mt-5 space-y-4"><div className="px-1 pb-0"><p className="font-mono text-[11px] font-bold tracking-[0.16em] text-slate-500">04 · DEVICES & ACTIVITY</p><h2 className="mt-1 text-lg font-black">設備與安全活動</h2></div>
          <Card className="border-2 border-amber-600 bg-amber-50 p-6" role="alert" aria-live="polite">
            <div className="mb-4 flex items-start gap-3"><AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" /><div><h3 className="font-black text-amber-950">未知設備登入警告</h3><p className="mt-1 text-xs text-amber-900">系統偵測到新設備登入時會在此要求確認若非本人操作，請立即撤銷該設備</p></div></div>
            {deviceAlertsLoading ? <Loader2 className="h-5 w-5 animate-spin text-amber-800" /> : !pendingDeviceAlerts?.length ? <p className="text-sm text-amber-900">目前沒有待確認的未知設備登入</p> : <div className="space-y-3">{pendingDeviceAlerts.map((alert) => { const networkLocation = alert.geoSource === "local-network" ? "內部或保留網路位址" : [alert.geoCity, alert.geoRegion, alert.geoCountry].filter(Boolean).join("，") || "位置暫時無法取得"; const sourceNote = alert.geoSource === "ipwho.is" ? "公開 IP 地理位置推估；僅供安全判斷，可能不精確" : alert.geoSource === "local-network" ? "此 IP 屬於內部或保留網路，未查詢外部位置資料" : "目前無法取得 IP 網路位置"; const canBlockIp = Boolean(profileData?.user?.isFounder && alert.ipAddress && alert.geoSource !== "local-network"); const isBlockingThisAlert = blockHighRiskDeviceIpMutation.isPending && pendingIpBlockAlertId === alert.id; return <div key={alert.id} className="border-2 border-amber-300 bg-white p-4"><div className="min-w-0"><p className="font-bold text-amber-950">{alert.deviceName || "未知設備"}</p><p className="mt-1 text-xs text-amber-900">IP：{alert.ipAddress || "未知"} · 偵測時間：{new Date(alert.createdAt).toLocaleString("zh-TW")}</p><p className="mt-1 text-xs text-amber-900">網路位置：{networkLocation}{alert.geoTimezone ? ` · 時區：${alert.geoTimezone}` : ""}</p><p className="mt-1 text-xs text-amber-900">網路歸屬：{[alert.geoIsp, alert.geoOrganization].filter(Boolean).join(" · ") || "未提供"}{alert.geoAsn ? ` · ASN：AS${alert.geoAsn}` : ""}</p>{alert.geoDomain && <p className="mt-1 break-words text-xs text-amber-900">網域：{alert.geoDomain}</p>}<p className="mt-1 text-xs text-amber-800">資料說明：{sourceNote}</p><p className="mt-1 break-words text-xs text-amber-800">裝置資訊：{alert.userAgent || "未提供"}</p></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button size="sm" onClick={() => confirmDeviceAlertMutation.mutate({ alertId: alert.id })} disabled={confirmDeviceAlertMutation.isPending || revokeDeviceAlertMutation.isPending || blockHighRiskDeviceIpMutation.isPending} className="border-2 border-gray-800 bg-gray-900 text-white hover:bg-gray-800"><Check className="mr-1 h-4 w-4" />這是我的設備</Button><Button variant="outline" size="sm" onClick={() => revokeDeviceAlertMutation.mutate({ alertId: alert.id })} disabled={confirmDeviceAlertMutation.isPending || revokeDeviceAlertMutation.isPending || blockHighRiskDeviceIpMutation.isPending} className="border-2 border-red-700 text-red-800 hover:bg-red-50"><MonitorX className="mr-1 h-4 w-4" />不是我的設備，立即撤銷</Button>{canBlockIp && <Button variant="outline" size="sm" onClick={() => { setPendingIpBlockAlertId(alert.id); if (auditPinVerified) blockHighRiskDeviceIpMutation.mutate({ alertId: alert.id }); else setAuditPinDialogOpen(true); }} disabled={confirmDeviceAlertMutation.isPending || revokeDeviceAlertMutation.isPending || blockHighRiskDeviceIpMutation.isPending} className="border-2 border-red-900 bg-red-900 text-white hover:bg-red-800"><AlertCircle className="mr-1 h-4 w-4" />{isBlockingThisAlert ? "封鎖中…" : "高風險：封鎖 IP 並撤銷"}</Button>}</div></div>; })}</div>}
          </Card>

          <Card className="p-6 border-2 border-gray-800">
            <div className="mb-4"><h3 className="flex items-center gap-2 font-black"><Smartphone className="w-5 h-5" />登入設備管理</h3><p className="mt-1 text-xs text-gray-600">撤銷不再使用或可疑的設備，該設備的後續請求會立即失效</p></div>
            {devicesLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !loginDevices?.length ? <p className="text-sm text-gray-600">尚無可管理的登入設備下次使用新版本登入後會自動記錄</p> : <div className="space-y-3">{loginDevices.map((device) => <div key={device.deviceId} className={`flex flex-col gap-3 border-2 p-3 sm:flex-row sm:items-center sm:justify-between ${device.revokedAt ? "border-gray-300 bg-gray-50 opacity-70" : "border-gray-800"}`}><div className="min-w-0"><p className="font-bold">{device.deviceName} {device.isCurrent && <span className="ml-1 text-xs text-green-700">目前設備</span>}</p><p className="mt-1 text-xs text-gray-600">IP：{device.ipAddress || "未知"} · 最近活動：{new Date(device.lastSeenAt).toLocaleString("zh-TW")}</p>{device.revokedAt && <p className="mt-1 text-xs text-red-700">已撤銷</p>}</div>{!device.revokedAt && <Button variant="outline" size="sm" onClick={() => revokeDeviceMutation.mutate({ deviceId: device.deviceId })} disabled={revokeDeviceMutation.isPending} className="shrink-0 border-red-600 text-red-700 hover:bg-red-50"><MonitorX className="mr-1 w-4 h-4" />撤銷設備</Button>}</div>)}</div>}
          </Card>

          <Card className="p-6 border-2 border-gray-800">
            <div className="mb-4"><h3 className="flex items-center gap-2 font-black"><KeyRound className="w-5 h-5" />帳號安全異動歷史</h3><p className="mt-1 text-xs text-gray-600">僅顯示您自己的密碼、通行密鑰、雙因素驗證、登入設備與聯絡資料驗證紀錄；不會顯示密碼、驗證碼或生物特徵內容</p></div>
            {securityActivityLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !securityActivity?.length ? <p className="text-sm text-gray-600">目前尚無可顯示的帳號安全異動紀錄</p> : <ol className="space-y-3 border-l-2 border-gray-200 pl-4">{securityActivity.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[1.45rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gray-900" /><p className="font-bold text-sm">{event.label}</p><p className="mt-1 text-xs text-gray-600">{event.entityName ? `${event.entityName} · ` : ""}{new Date(event.createdAt).toLocaleString("zh-TW")}</p></li>)}</ol>}
          </Card>
          </div>}
          <AuditPinDialog open={auditPinDialogOpen} onOpenChange={setAuditPinDialogOpen} onSuccess={() => { window.sessionStorage.setItem(AUDIT_PIN_SESSION_KEY, Date.now().toString()); setAuditPinVerified(true); setAuditPinDialogOpen(false); if (pendingIpBlockAlertId) blockHighRiskDeviceIpMutation.mutate({ alertId: pendingIpBlockAlertId }); }} onVerify={async (pin) => { await verifyAuditPinMutation.mutateAsync({ pin }); }} />
          <AlertDialog open={recoveryRegenerationConfirmOpen} onOpenChange={setRecoveryRegenerationConfirmOpen}><AlertDialogContent className="border-2 border-amber-700 bg-white"><AlertDialogHeader><AlertDialogTitle>確認重新產生備用恢復碼</AlertDialogTitle><AlertDialogDescription>此操作會立即撤銷目前所有未使用的備用恢復碼請確認您已不再需要現有代碼，並準備安全保存新的 10 組恢復碼</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={generateRecoveryCodesMutation.isPending}>取消</AlertDialogCancel><AlertDialogAction onClick={confirmRecoveryCodeRegeneration} disabled={generateRecoveryCodesMutation.isPending} className="bg-amber-700 text-white hover:bg-amber-800">確認撤銷並重新產生</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
