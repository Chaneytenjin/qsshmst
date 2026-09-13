import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Lock, User, AlertCircle, Clock, ShieldCheck, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { BrandLogo } from "@/components/BrandLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assessPasswordStrength } from "@/lib/passwordStrength";
import { sanitizeLoginPassword, sanitizeLoginUsername } from "@shared/loginCredentialPolicy";

type LoginForm = {
  username: string;
  password: string;
};

type FirstLoginSetupRequirement = {
  requiresFirstLoginSetup: true;
  firstLoginSetupToken: string;
  firstLoginSetupExpiresAt: Date | string;
  passwordSetupMode?: "first_login" | "password_reset";
  user: { username: string | null; usernameLocked?: boolean };
};

type FounderPinSetupRequirement = {
  requiresFounderPinSetup: true;
  founderPinSetupToken: string;
  founderPinSetupExpiresAt: Date | string;
};

const LOGIN_ROUTE_TRANSITION_KEY = "qingshui-login-route-transition";
const LOGIN_ENTRY_TRANSITION_MS = 160;
const LOGIN_FAILURE_TRANSITION_MS = 700;
const LOGIN_CHALLENGE_DURATION_MS = 5 * 60 * 1000;
const LOGIN_CHALLENGE_EXPIRY_TRANSITION_MS = 680;

function isFirstLoginSetupRequirement(data: unknown): data is FirstLoginSetupRequirement {
  return typeof data === "object" && data !== null && "requiresFirstLoginSetup" in data && (data as { requiresFirstLoginSetup?: unknown }).requiresFirstLoginSetup === true;
}

function isFounderPinSetupRequirement(data: unknown): data is FounderPinSetupRequirement {
  return typeof data === "object" && data !== null && "requiresFounderPinSetup" in data && (data as { requiresFounderPinSetup?: unknown }).requiresFounderPinSetup === true;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [firstLoginSetup, setFirstLoginSetup] = useState<{ token: string; expiresAt: Date | string; username: string; usernameLocked: boolean; mode: "first_login" | "password_reset" } | null>(null);
  const [firstLoginUsername, setFirstLoginUsername] = useState("");
  const [firstLoginPassword, setFirstLoginPassword] = useState("");
  const [firstLoginPasswordConfirmation, setFirstLoginPasswordConfirmation] = useState("");
  const [founderPinSetup, setFounderPinSetup] = useState<{ token: string; expiresAt: Date | string } | null>(null);
  const [initialLoginPin, setInitialLoginPin] = useState("");
  const [initialLoginPinConfirmation, setInitialLoginPinConfirmation] = useState("");
  const [initialAuditPin, setInitialAuditPin] = useState("");
  const [initialAuditPinConfirmation, setInitialAuditPinConfirmation] = useState("");
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"totp" | "recovery">("totp");
  const [founderPinChallengeToken, setFounderPinChallengeToken] = useState<string | null>(null);
  const [founderPin, setFounderPin] = useState("");
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<number | null>(null);
  const [isPasskeyLoginPending, setIsPasskeyLoginPending] = useState(false);
  const [isEstablishingSession, setIsEstablishingSession] = useState(false);
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [loginWelcomeName, setLoginWelcomeName] = useState("");
  const [credentialErrorMessage, setCredentialErrorMessage] = useState("");
  const [isCredentialErrorActive, setIsCredentialErrorActive] = useState(false);
  const [isKeyboardSubmitFeedback, setIsKeyboardSubmitFeedback] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordVisibilityControlActive, setIsPasswordVisibilityControlActive] = useState(false);
  const [loginFailureTransition, setLoginFailureTransition] = useState<{ id: number; message: string } | null>(null);
  const [challengeExpiryTransition, setChallengeExpiryTransition] = useState<{ id: number } | null>(null);
  const [isEnteringFromHome, setIsEnteringFromHome] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem(LOGIN_ROUTE_TRANSITION_KEY) === "true");
  const loginShellRef = useRef<HTMLDivElement>(null);
  const hadCredentialErrorRef = useRef(false);

  const { register, handleSubmit, clearErrors, reset } = useForm<LoginForm>({ shouldFocusError: false });
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<number | null>(null);
  const recordExpiredLoginChallengeMutation = trpc.customAuth.recordExpiredLoginChallenge.useMutation();
  const systemStatus = trpc.systemMaintenance.status.useQuery(undefined, { staleTime: 15_000, refetchInterval: 15_000, refetchOnWindowFocus: true });

  const clearLoginChallenge = () => {
    setTwoFactorChallengeToken(null);
    setTwoFactorCode("");
    setTwoFactorMethod("totp");
    setFounderPinChallengeToken(null);
    setFounderPin("");
    setChallengeExpiresAt(null);
  };

  const showCredentialError = (message: string) => {
    setCredentialErrorMessage(message);
    setIsCredentialErrorActive(false);
    window.requestAnimationFrame(() => setIsCredentialErrorActive(true));
  };

  const startLoginFailureExit = (message: string) => {
    setCredentialErrorMessage("");
    setIsCredentialErrorActive(false);
    setLoginFailureTransition((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
  };

  useEffect(() => {
    if (!isCredentialErrorActive) return;
    const timeout = window.setTimeout(() => setIsCredentialErrorActive(false), 380);
    return () => window.clearTimeout(timeout);
  }, [isCredentialErrorActive]);

  useEffect(() => {
    if (!isKeyboardSubmitFeedback) return;
    const timeout = window.setTimeout(() => setIsKeyboardSubmitFeedback(false), 150);
    return () => window.clearTimeout(timeout);
  }, [isKeyboardSubmitFeedback]);

  useEffect(() => {
    if (credentialErrorMessage) {
      hadCredentialErrorRef.current = true;
      return;
    }
    if (!hadCredentialErrorRef.current) return;
    hadCredentialErrorRef.current = false;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      const scrollToTopOptions: ScrollToOptions = { top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" };
      if (typeof loginShellRef.current?.scrollTo === "function") loginShellRef.current.scrollTo(scrollToTopOptions);
      else if (loginShellRef.current) loginShellRef.current.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [credentialErrorMessage]);

  useEffect(() => {
    if (!loginFailureTransition) return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setLoginFailureTransition(null);
      showCredentialError(loginFailureTransition.message);
      toast.error(`登入失敗：${loginFailureTransition.message}`);
    }, prefersReducedMotion ? 0 : LOGIN_FAILURE_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [loginFailureTransition]);

  useEffect(() => {
    if (!isEnteringFromHome) return;
    window.sessionStorage.removeItem(LOGIN_ROUTE_TRANSITION_KEY);
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setIsEnteringFromHome(false), prefersReducedMotion ? 0 : LOGIN_ENTRY_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isEnteringFromHome]);

  const startFirstLoginSetup = (data: FirstLoginSetupRequirement) => {
    const mode = data.passwordSetupMode === "password_reset" || data.user.usernameLocked ? "password_reset" : "first_login";
    setFirstLoginSetup({ token: data.firstLoginSetupToken, expiresAt: data.firstLoginSetupExpiresAt, username: data.user.username || "", usernameLocked: Boolean(data.user.usernameLocked), mode });
    setFirstLoginUsername(data.user.username || "");
    setFirstLoginPassword("");
    setFirstLoginPasswordConfirmation("");
    toast.info(mode === "password_reset" ? "管理員已重設密碼；請設定新密碼以完成安全重設" : "首次登入請先設定自訂帳號與新密碼；完成前不會建立工作階段");
  };

  const startFounderPinSetup = (data: FounderPinSetupRequirement) => {
    clearLoginChallenge();
    setFounderPinSetup({ token: data.founderPinSetupToken, expiresAt: data.founderPinSetupExpiresAt });
    setInitialLoginPin("");
    setInitialLoginPinConfirmation("");
    setInitialAuditPin("");
    setInitialAuditPinConfirmation("");
    toast.info("請完成一次性的登入 PIN 與稽核認證 PIN 初始設定；完成後將不可變更");
  };

  const beginLoginChallengeCountdown = (expiresAt?: Date | string | null) => {
    const localExpiry = Date.now() + LOGIN_CHALLENGE_DURATION_MS;
    const serverExpiry = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
    setChallengeExpiresAt(Number.isFinite(serverExpiry) ? Math.min(serverExpiry, localExpiry) : localExpiry);
  };

  useEffect(() => {
    if (!challengeExpiresAt) return;
    const activeChallengeToken = twoFactorChallengeToken || founderPinChallengeToken;
    if (!activeChallengeToken) return;
    const remaining = Math.max(0, challengeExpiresAt - Date.now());
    const timeout = window.setTimeout(() => {
      recordExpiredLoginChallengeMutation.mutate({ challengeToken: activeChallengeToken });
      setChallengeExpiryTransition((previous) => ({ id: (previous?.id ?? 0) + 1 }));
      clearLoginChallenge();
      reset({ username: "", password: "" });
      clearCredentialFeedback();
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [challengeExpiresAt, founderPinChallengeToken, recordExpiredLoginChallengeMutation, twoFactorChallengeToken]);

  useEffect(() => {
    if (!challengeExpiryTransition) return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      setChallengeExpiryTransition(null);
      toast.error("登入驗證挑戰已到期，請重新輸入帳號與密碼");
    }, prefersReducedMotion ? 0 : LOGIN_CHALLENGE_EXPIRY_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [challengeExpiryTransition]);

  const completeLogin = async (data: { success: boolean; user?: { username?: string | null; isTemporaryPassword?: boolean }; firstPasskeySecurityNotice?: boolean }, successMessage: string) => {
    if (!data.success) return;
    setChallengeExpiresAt(null);
    setIsEstablishingSession(true);
    try {
      const sessionUser = await utils.auth.me.fetch();
      if (!sessionUser) throw new Error("登入工作階段尚未建立");
      setLoginWelcomeName(sessionUser.name || sessionUser.username || data.user?.username || "使用者");
    } catch {
      toast.error("登入工作階段建立失敗，請重新登入；若問題持續，請聯絡管理員");
      return;
    } finally {
      setIsEstablishingSession(false);
    }
    setIsLoginTransitioning(true);
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      toast.success(data.firstPasskeySecurityNotice ? "安全通知：已首次使用此通行密鑰登入，可在個人資料的安全活動查看紀錄" : successMessage);
      setLocation("/dashboard");
    }, prefersReducedMotion ? 0 : 760);
  };

  const loginMutation = trpc.customAuth.login.useMutation({
    onSuccess: (data) => {
      if (isFirstLoginSetupRequirement(data)) {
        startFirstLoginSetup(data);
        return;
      }
      if (isFounderPinSetupRequirement(data)) {
        startFounderPinSetup(data);
        return;
      }
      if (data.requiresTwoFactor) {
        setTwoFactorChallengeToken(data.twoFactorChallengeToken);
        setTwoFactorCode("");
        setTwoFactorMethod("totp");
        beginLoginChallengeCountdown(data.challengeExpiresAt);
        toast.info("請輸入驗證器 App 顯示的六位數驗證碼");
        return;
      }
      if ("requiresFounderPin" in data && data.requiresFounderPin) {
        setFounderPinChallengeToken(data.founderPinChallengeToken);
        setFounderPin("");
        beginLoginChallengeCountdown(data.challengeExpiresAt);
        toast.info("創始管理員請輸入六位數登入 PIN 以完成登入");
        return;
      }
      void completeLogin(data, "登入成功");
    },
    onError: (error) => {
      const message = error.message || "登入失敗";
      if (message.includes("已被鎖定")) {
        const timeMatch = message.match(/(\d+)\s*秒/);
        if (timeMatch) {
          setLockoutTimeRemaining(Number.parseInt(timeMatch[1], 10));
          const interval = window.setInterval(() => {
            setLockoutTimeRemaining((previous) => {
              if (previous === null || previous <= 1) {
                window.clearInterval(interval);
                return null;
              }
              return previous - 1;
            });
          }, 1000);
        }
      }
      startLoginFailureExit(message);
    },
  });

  const verifyTwoFactorMutation = trpc.customAuth.verifyTwoFactorLogin.useMutation({
    onSuccess: (data) => {
      setTwoFactorChallengeToken(null);
      if (isFirstLoginSetupRequirement(data)) {
        startFirstLoginSetup(data);
        return;
      }
      if (isFounderPinSetupRequirement(data)) {
        startFounderPinSetup(data);
        return;
      }
      if ("requiresFounderPin" in data && data.requiresFounderPin) {
        setFounderPinChallengeToken(data.founderPinChallengeToken);
        setFounderPin("");
        beginLoginChallengeCountdown(data.challengeExpiresAt);
        toast.info("雙因素驗證成功，請繼續輸入創始管理員登入 PIN");
        return;
      }
      void completeLogin(data, "雙因素驗證成功，已登入");
    },
    onError: (error) => toast.error(error.message || "雙因素驗證失敗"),
  });

  const verifyTwoFactorRecoveryCodeMutation = trpc.customAuth.verifyTwoFactorRecoveryCode.useMutation({
    onSuccess: (data) => {
      setTwoFactorChallengeToken(null);
      setTwoFactorMethod("totp");
      if (isFirstLoginSetupRequirement(data)) {
        startFirstLoginSetup(data);
        return;
      }
      if (isFounderPinSetupRequirement(data)) {
        startFounderPinSetup(data);
        return;
      }
      if ("requiresFounderPin" in data && data.requiresFounderPin) {
        setFounderPinChallengeToken(data.founderPinChallengeToken);
        setFounderPin("");
        beginLoginChallengeCountdown(data.challengeExpiresAt);
        toast.info("恢復碼已使用，請繼續輸入創始管理員登入 PIN");
        return;
      }
      void completeLogin(data, "恢復碼驗證成功，已登入");
    },
    onError: (error) => toast.error(error.message || "恢復碼驗證失敗"),
  });

  const verifyFounderPinMutation = trpc.customAuth.verifyFounderLoginPin.useMutation({
    onSuccess: (data) => {
      if (isFounderPinSetupRequirement(data)) {
        startFounderPinSetup(data);
        return;
      }
      setFounderPinChallengeToken(null);
      setFounderPin("");
      void completeLogin(data, "三因素驗證成功，已登入");
    },
    onError: (error) => toast.error(error.message || "創始管理員登入 PIN 驗證失敗"),
  });
  const completeFounderPinSetupMutation = trpc.customAuth.completeFounderPinSetup.useMutation({
    onSuccess: (data) => {
      setFounderPinSetup(null);
      setInitialLoginPin("");
      setInitialLoginPinConfirmation("");
      setInitialAuditPin("");
      setInitialAuditPinConfirmation("");
      void completeLogin(data, "雙 PIN 初始設定完成，已登入");
    },
    onError: (error) => toast.error(error.message || "雙 PIN 初始設定失敗，請重新登入"),
  });

  const beginPasskeyLoginMutation = trpc.customAuth.beginPasskeyLogin.useMutation();
  const finishPasskeyLoginMutation = trpc.customAuth.finishPasskeyLogin.useMutation();
  const completeFirstLoginSetupMutation = trpc.customAuth.completeFirstLoginSetup.useMutation({
    onSuccess: () => {
      const username = firstLoginUsername;
      const password = firstLoginPassword;
      const completedPasswordReset = firstLoginSetup?.mode === "password_reset";
      setFirstLoginSetup(null);
      setFirstLoginPassword("");
      setFirstLoginPasswordConfirmation("");
      toast.success(completedPasswordReset ? "密碼重設完成，正在建立工作階段" : "自訂帳號與新密碼已完成設定，正在建立工作階段");
      loginMutation.mutate({ username, password });
    },
    onError: (error) => toast.error(error.message || (firstLoginSetup?.mode === "password_reset" ? "密碼重設失敗，請重新登入" : "首次登入設定失敗，請重新登入")),
  });

  const onSubmit = (data: LoginForm) => {
    setCredentialErrorMessage("");
    loginMutation.mutate(data);
  };

  const onInvalidCredentialSubmit = (invalidFields: Partial<Record<keyof LoginForm, unknown>>) => {
    const usernameMissing = Boolean(invalidFields.username);
    const passwordMissing = Boolean(invalidFields.password);
    const message = usernameMissing && passwordMissing ? "請輸入帳號與密碼" : usernameMissing ? "請輸入帳號" : "請輸入密碼";
    showCredentialError(message);
  };

  const clearCredentialFeedback = () => {
    setCredentialErrorMessage("");
    clearErrors(["username", "password"]);
  };

  const restrictLoginUsername = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = sanitizeLoginUsername(event.currentTarget.value);
    clearCredentialFeedback();
  };

  const restrictLoginPassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = sanitizeLoginPassword(event.currentTarget.value);
    clearCredentialFeedback();
  };

  const returnToCredentialLogin = () => {
    clearLoginChallenge();
    reset({ username: "", password: "" });
    clearCredentialFeedback();
  };

  const onVerifyTwoFactor = (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFactorChallengeToken) return;
    if (twoFactorMethod === "recovery") {
      verifyTwoFactorRecoveryCodeMutation.mutate({ challengeToken: twoFactorChallengeToken, code: twoFactorCode });
      return;
    }
    verifyTwoFactorMutation.mutate({ challengeToken: twoFactorChallengeToken, code: twoFactorCode });
  };

  const onVerifyFounderPin = (event: React.FormEvent) => {
    event.preventDefault();
    if (founderPinChallengeToken) verifyFounderPinMutation.mutate({ challengeToken: founderPinChallengeToken, pin: founderPin });
  };

  const onCompleteFounderPinSetup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!founderPinSetup) return;
    completeFounderPinSetupMutation.mutate({
      challengeToken: founderPinSetup.token,
      loginPin: initialLoginPin,
      confirmLoginPin: initialLoginPinConfirmation,
      auditPin: initialAuditPin,
      confirmAuditPin: initialAuditPinConfirmation,
    });
  };

  const firstLoginPasswordStrength = assessPasswordStrength(firstLoginPassword);
  const firstLoginStrengthStyle = firstLoginPasswordStrength.level === "strong" ? "bg-emerald-400 text-emerald-200" : firstLoginPasswordStrength.level === "medium" ? "bg-amber-400 text-amber-200" : "bg-rose-400 text-rose-200";
  const credentialFeedbackMessage = credentialErrorMessage;
  const isCredentialVerificationActive = loginMutation.isPending || isEstablishingSession;
  const isTwoFactorChallengeActive = Boolean(twoFactorChallengeToken);
  const isPasskeyOnlySystemMode = systemStatus.data?.systemMode === "maintenance" || systemStatus.data?.systemMode === "offline";

  const handlePasskeyLogin = async () => {
    if (!window.PublicKeyCredential) {
      toast.error("此瀏覽器不支援通行密鑰，請改用帳號密碼登入");
      return;
    }
    setIsPasskeyLoginPending(true);
    try {
      const options = await beginPasskeyLoginMutation.mutateAsync();
      const response = await startAuthentication({ optionsJSON: options });
      const result = await finishPasskeyLoginMutation.mutateAsync({ response: response as any });
      if (isFirstLoginSetupRequirement(result)) {
        startFirstLoginSetup(result);
        return;
      }
      if (isFounderPinSetupRequirement(result)) {
        startFounderPinSetup(result);
        return;
      }
      if ("requiresFounderPin" in result && result.requiresFounderPin) {
        setFounderPinChallengeToken(result.founderPinChallengeToken);
        setFounderPin("");
        beginLoginChallengeCountdown(result.challengeExpiresAt);
        toast.info(result.firstPasskeySecurityNotice ? "安全通知：已首次驗證此通行密鑰請繼續輸入創始管理員登入 PIN" : "通行密鑰已驗證，請繼續輸入創始管理員登入 PIN");
        return;
      }
      await completeLogin(result, "通行密鑰驗證成功，已登入");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const message = error instanceof Error ? error.message : "";
      toast.error(name === "NotAllowedError" ? "已取消通行密鑰驗證" : message || "通行密鑰登入失敗，請改用帳號密碼登入");
    } finally {
      setIsPasskeyLoginPending(false);
    }
  };

  return (
    <div ref={loginShellRef} className={`login-shell relative min-h-screen flex items-center justify-center p-4 ${credentialFeedbackMessage ? "login-shell--has-credential-feedback" : ""} ${isTwoFactorChallengeActive ? "login-shell--two-factor" : ""} ${isEnteringFromHome ? "login-shell--entering" : "login-shell--ready"}`}>
      {isEnteringFromHome && <div className="login-entry-transition" role="status" aria-live="polite" data-testid="login-entry-transition"><div className="login-entry-transition-orbit" aria-hidden="true"><i /><i /></div><div><span>ACCESS INTERFACE LOADING</span><strong>正在建立安全登入通道</strong><em>MEDIA SERVICE // CREDENTIAL GATEWAY</em></div></div>}
      {isCredentialVerificationActive && <div className="login-credential-verification" role="status" aria-live="polite" data-testid="login-credential-verification"><div className="login-credential-verification-orbit" aria-hidden="true"><i /><i /></div><div><span>ACCOUNT CREDENTIAL VERIFICATION</span><strong>{loginMutation.isPending ? "正在驗證帳號與密碼" : "正在建立安全工作階段"}</strong><em>AUTHENTICATING · VERIFYING · LINKING SESSION</em></div></div>}
      {loginFailureTransition && <div className="login-credential-failure" role="alert" aria-live="assertive" data-testid="login-credential-failure"><div className="login-credential-failure-orbit" aria-hidden="true"><i /><i /></div><div><span>AUTHENTICATION REJECTED</span><strong>登入驗證未通過</strong><p>{loginFailureTransition.message}</p><em>SECURE EXIT · CREDENTIALS NOT ACCEPTED</em></div></div>}
      {challengeExpiryTransition && <div className="login-challenge-expiry-transition" role="alert" aria-live="assertive" data-testid="login-challenge-expiry-transition"><div className="login-challenge-expiry-orbit" aria-hidden="true"><i /><i /></div><div><span>SECURITY CHALLENGE EXPIRED</span><strong>驗證挑戰已逾時</strong><p>為保護帳號安全，系統已清除登入資訊</p><em>RETURNING TO CREDENTIAL GATEWAY</em></div></div>}
      <button type="button" onClick={() => setLocation("/")} className="login-back-control absolute left-4 top-4 inline-flex items-center justify-center p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.15_210)]" aria-label="返回首頁" title="返回首頁"><ArrowLeft size={24} aria-hidden="true" /></button>
      <div className={`login-console transition-[opacity,transform] duration-300 ease-out ${isLoginTransitioning ? "pointer-events-none scale-[0.985] opacity-0" : "opacity-100"}`}>
        <div className="login-brand-block mb-8">
          <div className="login-brand-emblem"><BrandLogo className="login-brand-logo h-28 w-28 rounded-full object-contain" /></div>
          <p className="login-brand-kicker">MEDIA SERVICE SYSTEM LOGIN</p>
          <h1 className="login-brand-title">清水高中媒體服務隊管理系統</h1>
          <p className="login-brand-subtitle">器材 · 借用 · 安全 · 追蹤</p>
        </div>
        {(systemStatus.data?.announcement || systemStatus.data?.estimatedRestoredAt || systemStatus.data?.scheduledFor) && <div className={`login-system-notice login-system-notice--${systemStatus.data?.systemMode ?? "online"}`} role="status" aria-live="polite">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em]">{systemStatus.data?.scheduledFor && systemStatus.data?.scheduledMode ? `SCHEDULED ${systemStatus.data.scheduledMode.toUpperCase()}` : systemStatus.data?.systemMode === "offline" ? "SYSTEM OFFLINE" : systemStatus.data?.systemMode === "maintenance" ? "SYSTEM MAINTENANCE" : "SYSTEM NOTICE"}</p>
          {systemStatus.data?.announcement && <p className="mt-1 text-sm leading-6">{systemStatus.data.announcement}</p>}
          {systemStatus.data?.scheduledFor && <p className="mt-1 text-xs">預告開始：{new Date(systemStatus.data.scheduledFor).toLocaleString("zh-TW")}</p>}
          {systemStatus.data?.estimatedRestoredAt && <p className="mt-1 text-xs">預計恢復：{new Date(systemStatus.data.estimatedRestoredAt).toLocaleString("zh-TW")}</p>}
        </div>}

        {!twoFactorChallengeToken && !founderPinChallengeToken ? isPasskeyOnlySystemMode ? (
          <section className="login-command-card login-passkey-only-card space-y-4" data-testid="login-passkey-only-panel" aria-label="受限制系統模式登入">
            <div className="login-passkey-only-copy"><ShieldCheck size={18} aria-hidden="true" /><p className="login-passkey-only-status" data-testid="login-passkey-mode-label">{systemStatus.data?.systemMode === "offline" ? "SYSTEM OFFLINE" : "SYSTEM MAINTENANCE"}</p></div>
            <button type="button" className="login-passkey-command flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" onClick={handlePasskeyLogin} disabled={isPasskeyLoginPending}>
              <KeyRound size={17} />
              {isPasskeyLoginPending ? "等待裝置驗證…" : "使用通行密鑰登入"}
            </button>
          </section>
        ) : (
          <form onSubmit={handleSubmit(onSubmit, onInvalidCredentialSubmit)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) setIsKeyboardSubmitFeedback(true); }} className={`login-command-card space-y-5 ${isCredentialErrorActive ? "login-credential-shake" : ""}`}>
            <div>
              <label className="label-caps mb-2 block">帳號</label>
              <div className="login-tech-field">
                <User className="login-tech-field-icon" size={16} aria-hidden="true" />
                <input type="text" autoFocus={false} className="industrial-input login-tech-input" placeholder="輸入帳號" inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} title="帳號僅限英文字母與數字" {...register("username", { required: true, onChange: restrictLoginUsername })} disabled={isCredentialVerificationActive} />
                <span className="login-tech-field-status" aria-hidden="true" />
              </div>
            </div>
            <div>
              <label className="label-caps mb-2 block">密碼</label>
              <div className={`login-tech-field ${isPasswordVisibilityControlActive ? "login-tech-field--visibility-control-active" : ""}`} onFocusCapture={() => setIsPasswordVisibilityControlActive(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPasswordVisibilityControlActive(false); }}>
                <Lock className="login-tech-field-icon" size={16} aria-hidden="true" />
                <input type={isPasswordVisible ? "text" : "password"} className="industrial-input login-tech-input login-tech-input--password" placeholder="輸入密碼" inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} title="密碼僅限英文字母、數字及特殊符號" {...register("password", { required: true, onChange: restrictLoginPassword })} disabled={isCredentialVerificationActive} />
                <button type="button" className="login-password-visibility-toggle" onPointerDown={() => setIsPasswordVisibilityControlActive(true)} onClick={() => { setIsPasswordVisibilityControlActive(true); setIsPasswordVisible((visible) => !visible); }} disabled={isCredentialVerificationActive} aria-label={isPasswordVisible ? "隱藏密碼" : "顯示密碼"} aria-pressed={isPasswordVisible} title={isPasswordVisible ? "隱藏密碼" : "顯示密碼"}>{isPasswordVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
                <span className="login-tech-field-status" aria-hidden="true" />
              </div>
            </div>
            <button type="submit" className={`login-submit-command w-full ${isKeyboardSubmitFeedback ? "login-submit-command--keyboard-press" : ""}`} disabled={isCredentialVerificationActive || lockoutTimeRemaining !== null} data-testid="login-submit-button">
              <span className="login-submit-command-indicator login-submit-command-indicator--start" aria-hidden="true" />
              <span className="login-submit-command-copy"><span className="login-submit-command-primary"><ShieldCheck className="login-submit-command-check" size={18} aria-hidden="true" /><strong>{loginMutation.isPending ? "登入中…" : isEstablishingSession ? "建立工作階段中…" : isLoginTransitioning ? "登入成功，正在進入系統…" : lockoutTimeRemaining !== null ? `帳號已鎖定 (${lockoutTimeRemaining}s)` : "登入"}</strong></span><span>LOGIN</span></span>
              <span className="login-submit-command-indicator" aria-hidden="true" />
            </button>
            <div className="login-credential-feedback" aria-live="polite">{credentialFeedbackMessage && <div className="login-credential-error login-credential-error--server" role="alert">{credentialFeedbackMessage}</div>}</div>
            <div className="flex items-center gap-3 py-1" aria-hidden="true"><span className="h-px flex-1 bg-[oklch(0.28_0_0)]" /><span className="text-xs text-[oklch(0.55_0_0)]">或</span><span className="h-px flex-1 bg-[oklch(0.28_0_0)]" /></div>
            <button type="button" className="login-passkey-command flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" onClick={handlePasskeyLogin} disabled={loginMutation.isPending || isEstablishingSession || isPasskeyLoginPending || lockoutTimeRemaining !== null}>
              <KeyRound size={17} />
              {isPasskeyLoginPending ? "等待裝置驗證…" : "使用通行密鑰登入"}
            </button>
          </form>
        ) : twoFactorChallengeToken ? (
          <form onSubmit={onVerifyTwoFactor} className="login-command-card login-two-factor-card space-y-6" aria-label="雙因素驗證">
            <div className="login-two-factor-intro"><div className="flex gap-3"><ShieldCheck className="login-auth-intro-icon" size={19} /><div><p className="login-auth-intro-title">{twoFactorMethod === "recovery" ? "使用備用恢復碼" : "雙因素驗證"}</p></div></div></div>
            {twoFactorMethod === "recovery" ? <div><label className="label-caps mb-2 block">備用恢復碼</label><input type="text" autoComplete="one-time-code" maxLength={14} className="industrial-input text-center font-mono text-lg tracking-[0.2em] uppercase" placeholder="ABCD-EFGH-JKLM" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 14))} autoFocus disabled={verifyTwoFactorRecoveryCodeMutation.isPending} /></div> : <div><label className="label-caps mb-2 block">驗證碼</label><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} className="industrial-input text-center font-mono text-xl tracking-[0.45em]" placeholder="000000" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus disabled={verifyTwoFactorMutation.isPending} /></div>}
            <button type="submit" className="login-auth-submit-command" disabled={(twoFactorMethod === "recovery" ? twoFactorCode.replace(/[^A-Z0-9]/g, "").length !== 12 : twoFactorCode.length !== 6) || verifyTwoFactorMutation.isPending || verifyTwoFactorRecoveryCodeMutation.isPending} data-testid="two-factor-login-submit"><ShieldCheck size={17} aria-hidden="true" /><span>{verifyTwoFactorMutation.isPending || verifyTwoFactorRecoveryCodeMutation.isPending ? "登入中…" : "登入"}</span></button>
            <button type="button" className="login-auth-link" onClick={() => { setTwoFactorMethod((method) => method === "totp" ? "recovery" : "totp"); setTwoFactorCode(""); }} disabled={verifyTwoFactorMutation.isPending || verifyTwoFactorRecoveryCodeMutation.isPending}>{twoFactorMethod === "totp" ? "無法取得驗證器？改用備用恢復碼" : "改用驗證器 App 驗證碼"}</button>
            <button type="button" className="login-auth-return" onClick={returnToCredentialLogin} disabled={verifyTwoFactorMutation.isPending || verifyTwoFactorRecoveryCodeMutation.isPending}><ArrowLeft size={15} aria-hidden="true" />返回帳號密碼登入</button>
          </form>
        ) : (
          <form onSubmit={onVerifyFounderPin} className="login-command-card space-y-6" aria-label="創始管理員登入 PIN 驗證">
            <div className="login-founder-verification-intro"><div className="flex gap-3"><ShieldCheck className="login-auth-intro-icon" size={19} /><div><p className="login-auth-intro-title">創始管理員登入驗證</p></div></div></div>
            <div><label htmlFor="founder-login-pin" className="label-caps mb-2 block">登入 PIN 碼</label><input id="founder-login-pin" type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} className="industrial-input text-center font-mono text-xl tracking-[0.45em]" placeholder="••••••" value={founderPin} onChange={(event) => setFounderPin(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus disabled={verifyFounderPinMutation.isPending} /></div>
            <button type="submit" className="login-auth-submit-command login-auth-submit-command--founder" disabled={founderPin.length !== 6 || verifyFounderPinMutation.isPending} data-testid="founder-login-verify-submit"><ShieldCheck size={17} aria-hidden="true" /><span>{verifyFounderPinMutation.isPending ? "認證中…" : "認證"}</span></button>
            <button type="button" className="login-auth-return" onClick={returnToCredentialLogin} disabled={verifyFounderPinMutation.isPending}><ArrowLeft size={15} aria-hidden="true" />取消並返回帳號密碼登入</button>
          </form>
        )}

        {lockoutTimeRemaining !== null && <div className="mt-6 border border-[oklch(0.75_0.18_25)] bg-[oklch(0.55_0.18_25)] p-4"><div className="flex gap-3"><Clock size={16} className="mt-0.5 flex-shrink-0 text-[oklch(0.75_0.18_25)]" /><div className="text-xs leading-relaxed text-[oklch(0.95_0_0)]"><p className="mb-1 font-semibold">帳號已被鎖定</p><p>由於登入失敗次數過多，帳號已被鎖定 15 分鐘</p><p className="mt-1">剩餘鎖定時間：<strong>{lockoutTimeRemaining}</strong> 秒</p></div></div></div>}
        {!twoFactorChallengeToken && !founderPinChallengeToken && !isPasskeyOnlySystemMode && <div className="login-security-note mt-6 border p-4"><div className="flex gap-3"><AlertCircle size={17} className="mt-0.5 shrink-0 text-[oklch(0.75_0.12_85)]" aria-hidden="true" /><div className="login-first-login-copy text-xs leading-relaxed text-[oklch(0.67_0.05_210)]"><p className="login-first-login-title mb-1 font-semibold text-[oklch(0.86_0.08_210)]">首次登入？</p><p>請聯繫管理員取得帳號資訊</p></div></div></div>}
      </div>
      <Dialog open={Boolean(firstLoginSetup)} onOpenChange={() => undefined}>
        <DialogContent className="border border-[oklch(0.68_0.14_65)] bg-[oklch(0.12_0_0)] text-white sm:max-w-md" aria-describedby={undefined} data-testid={firstLoginSetup?.mode === "password_reset" ? "password-reset-dialog" : "first-login-setup-dialog"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><ShieldCheck className="text-[oklch(0.78_0.14_65)]" size={20} />{firstLoginSetup?.mode === "password_reset" ? "密碼重設" : "完成首次登入設定"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={(event) => { event.preventDefault(); if (firstLoginSetup) completeFirstLoginSetupMutation.mutate({ challengeToken: firstLoginSetup.token, username: firstLoginUsername.trim(), newPassword: firstLoginPassword, confirmPassword: firstLoginPasswordConfirmation }); }}>
            <div className="border border-[oklch(0.45_0.12_65)] bg-[oklch(0.18_0.04_55)] p-3 text-xs leading-relaxed text-[oklch(0.88_0.08_75)]">{firstLoginSetup?.mode === "password_reset" ? "管理員已重設您的密碼請使用新的臨時密碼登入後，立即設定新密碼；帳號名稱維持不變" : "為保護帳號安全，請先設定您要使用的自訂帳號與新密碼兩項均完成前，系統不會建立可使用的工作階段"}</div>
            {firstLoginSetup?.mode !== "password_reset" && <div><label htmlFor="first-login-username" className="label-caps mb-2 block">自訂帳號</label><input id="first-login-username" value={firstLoginUsername} onChange={(event) => setFirstLoginUsername(event.target.value)} className="industrial-input" autoComplete="username" autoFocus disabled={completeFirstLoginSetupMutation.isPending} /><p className="mt-1 text-[11px] text-[oklch(0.60_0_0)]">可使用英文字母、數字、句點、底線與連字號，至少 3 個字元</p></div>}
            <div><label htmlFor="first-login-password" className="label-caps mb-2 block">新密碼</label><input id="first-login-password" type="password" value={firstLoginPassword} onChange={(event) => setFirstLoginPassword(event.target.value)} className="industrial-input" autoComplete="new-password" disabled={completeFirstLoginSetupMutation.isPending} /><div className="mt-2 rounded-md border border-[oklch(0.28_0_0)] bg-[oklch(0.15_0_0)] p-3" aria-live="polite" data-testid="first-login-password-strength"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-[oklch(0.62_0_0)]">密碼強度</span><strong className={firstLoginPasswordStrength.level === "strong" ? "text-emerald-200" : firstLoginPasswordStrength.level === "medium" ? "text-amber-200" : "text-rose-200"}>{firstLoginPasswordStrength.label}</strong></div><div className="mt-2 h-1.5 overflow-hidden bg-[oklch(0.28_0_0)]" role="progressbar" aria-label="新密碼強度" aria-valuemin={0} aria-valuemax={5} aria-valuenow={firstLoginPasswordStrength.score}><div className={`h-full transition-[width] duration-200 ${firstLoginStrengthStyle}`} style={{ width: `${(firstLoginPasswordStrength.score / 5) * 100}%` }} /></div><p className="mt-2 text-[11px] leading-relaxed text-[oklch(0.66_0_0)]">{firstLoginPasswordStrength.suggestions.join("、") || "密碼組合良好，請妥善保管"}</p></div></div>
            <div><label htmlFor="first-login-password-confirmation" className="label-caps mb-2 block">確認新密碼</label><input id="first-login-password-confirmation" type="password" value={firstLoginPasswordConfirmation} onChange={(event) => setFirstLoginPasswordConfirmation(event.target.value)} className="industrial-input" autoComplete="new-password" disabled={completeFirstLoginSetupMutation.isPending} /></div>
            <p className="text-[11px] text-[oklch(0.60_0_0)]">{firstLoginSetup?.mode === "password_reset" ? "本次密碼重設" : "本次安全設定"}將於 {firstLoginSetup ? new Date(firstLoginSetup.expiresAt).toLocaleTimeString("zh-TW", { hour12: false }) : ""} 前完成，逾時後請重新使用臨時密碼登入</p>
            <button type="submit" className="btn-primary w-full" disabled={completeFirstLoginSetupMutation.isPending || firstLoginUsername.trim().length < 3 || !firstLoginPassword || !firstLoginPasswordConfirmation}>{completeFirstLoginSetupMutation.isPending ? (firstLoginSetup?.mode === "password_reset" ? "重設密碼中…" : "更新帳號安全設定中…") : (firstLoginSetup?.mode === "password_reset" ? "更新密碼並進入系統" : "儲存設定並進入系統")}</button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(founderPinSetup)} onOpenChange={() => undefined}>
        <DialogContent className="border border-[oklch(0.53_0.12_210)] bg-[oklch(0.12_0_0)] text-white sm:max-w-lg" aria-describedby={undefined} data-testid="founder-pin-setup-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><KeyRound className="text-[oklch(0.74_0.12_210)]" size={20} />創始管理員雙 PIN 初始設定</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={onCompleteFounderPinSetup}>
            <div className="border border-[oklch(0.34_0.08_210)] bg-[oklch(0.16_0.03_220)] p-3 text-xs leading-relaxed text-[oklch(0.84_0.05_210)]">此畫面僅會在本次初始設定出現一次請分別設定六位數的登入 PIN 與稽核認證 PIN；兩組 PIN 必須不同，完成後系統不提供設定、重設或變更功能</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="initial-login-pin" className="label-caps mb-2 block">登入 PIN</label><input id="initial-login-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} className="industrial-input text-center font-mono tracking-[0.35em]" placeholder="••••••" value={initialLoginPin} onChange={(event) => setInitialLoginPin(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus disabled={completeFounderPinSetupMutation.isPending} /></div>
              <div><label htmlFor="initial-login-pin-confirmation" className="label-caps mb-2 block">確認登入 PIN</label><input id="initial-login-pin-confirmation" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} className="industrial-input text-center font-mono tracking-[0.35em]" placeholder="••••••" value={initialLoginPinConfirmation} onChange={(event) => setInitialLoginPinConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={completeFounderPinSetupMutation.isPending} /></div>
              <div><label htmlFor="initial-audit-pin" className="label-caps mb-2 block">稽核認證 PIN</label><input id="initial-audit-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} className="industrial-input text-center font-mono tracking-[0.35em]" placeholder="••••••" value={initialAuditPin} onChange={(event) => setInitialAuditPin(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={completeFounderPinSetupMutation.isPending} /></div>
              <div><label htmlFor="initial-audit-pin-confirmation" className="label-caps mb-2 block">確認稽核認證 PIN</label><input id="initial-audit-pin-confirmation" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} className="industrial-input text-center font-mono tracking-[0.35em]" placeholder="••••••" value={initialAuditPinConfirmation} onChange={(event) => setInitialAuditPinConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={completeFounderPinSetupMutation.isPending} /></div>
            </div>
            <p className="text-[11px] text-[oklch(0.60_0_0)]">本次設定將於 {founderPinSetup ? new Date(founderPinSetup.expiresAt).toLocaleTimeString("zh-TW", { hour12: false }) : ""} 前完成逾時後請重新登入</p>
            <button type="submit" className="btn-primary w-full" disabled={completeFounderPinSetupMutation.isPending || initialLoginPin.length !== 6 || initialLoginPinConfirmation.length !== 6 || initialAuditPin.length !== 6 || initialAuditPinConfirmation.length !== 6}>{completeFounderPinSetupMutation.isPending ? "正在完成唯一初始設定…" : "完成雙 PIN 初始設定並進入系統"}</button>
          </form>
        </DialogContent>
      </Dialog>
      {isLoginTransitioning && <div className="auth-session-transition auth-session-transition-enter" role="status" aria-live="polite" data-testid="login-success-transition"><div className="auth-session-grid" aria-hidden="true" /><div className="auth-session-scanline" aria-hidden="true" /><div className="auth-session-radar auth-session-radar-one" aria-hidden="true" /><div className="auth-session-radar auth-session-radar-two" aria-hidden="true" /><div className="auth-session-transition-card"><span className="auth-session-kicker">SESSION LINK ESTABLISHED</span><BrandLogo className="brand-logo h-12 w-12 border border-white/15 object-cover" /><p>歡迎回來，{loginWelcomeName}</p><span>身份已驗證 · 正在連線至工作階段</span><div className="auth-session-progress" aria-hidden="true"><i /></div></div></div>}
    </div>
  );
}
