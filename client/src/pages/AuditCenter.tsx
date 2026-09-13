import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatAuditActor } from "@/lib/utils";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLoginRisk, getOperationRisk, isRiskEvent, type AuditRisk } from "@/lib/auditRisk";
import { AlertTriangle, Ban, CheckCircle, ClipboardList, History, KeyRound, LockKeyhole, Mail, Power, RotateCcw, Search, ShieldAlert, UserRoundSearch, XCircle } from "lucide-react";

const AUDIT_PIN_SESSION_KEY = "qingshui-audit-pin-verified-at";
const PIN_VALIDITY_MS = 30 * 60 * 1000;
const summaryPeriodLabels = { "24h": "24 小時", "7d": "7 天", "30d": "30 天" } as const;

const operationLabels: Record<string, string> = {
  create: "新增", update: "修改", delete: "刪除", activate: "啟用", deactivate: "停用",
  approve: "核准", reject: "拒絕", cancel: "取消", return: "歸還", resetPassword: "重置密碼",
  borrow: "直接借出", lockLogin: "鎖定登入", unlockLogin: "解除登入鎖定",
  viewUserManagement: "查看帳號管理", viewUserLoginSecurity: "查看登入安全狀態", viewTemporaryPassword: "查看臨時密碼",
  viewBorrowRequests: "查看借用申請管理", viewLoginAudit: "查看登入稽核", viewOperationAuditLog: "查看操作日誌", idleTimeoutLogout: "閒置逾時登出", updateAuditEventResolution: "更新異常事件處理",
  runAccountDeduplication: "執行帳號去重檢查", deactivateDuplicateAccount: "停用重複帳號",
  bulkTestAccountStatus: "批次更新測試帳號", cleanupTestAccounts: "清理測試帳號", viewAccountLifecycleAudit: "查看帳號歷程",
  updateEquipmentCategory: "更新器材分類", reassignEquipmentCategory: "重新分類器材", batchReassignEquipmentCategory: "批次重新分類器材",
  saveAnnualReimbursementBudget: "設定年度報帳預算", exportReimbursementAnalysisPdf: "匯出報帳分析 PDF",
  viewProtectedAccountSecuritySummary: "查看受保護帳號安全摘要", viewFullAuditIpAddress: "查看完整稽核 IP 位址",
  loginChallengeExpired: "登入驗證挑戰逾時",
  setSystemOnlineMode: "恢復系統上線", enableSystemMaintenanceMode: "啟用系統維護", enableSystemOfflineMode: "設為系統離線",
  scheduleSystemModeChange: "建立系統模式預告", cancelScheduledSystemMode: "取消系統模式預告", systemModeForcedLogout: "系統模式強制登出",
};

const systemModeHistoryLabels: Record<string, string> = {
  online: "SYSTEM ONLINE",
  maintenance: "SYSTEM MAINTENANCE",
  offline: "SYSTEM OFFLINE",
};

const detailLabels: Record<string, string> = {
  changedFields: "異動欄位", previousRole: "原角色", newRole: "新角色", previousIsActive: "原啟用狀態", newIsActive: "新啟用狀態",
  quantity: "數量", borrowDate: "借用日", returnDate: "預定歸還日", status: "狀態", reviewNote: "審核備註", returnNote: "歸還備註",
  resultCount: "結果筆數", page: "頁碼", pageSize: "每頁筆數", duplicateGroupCount: "重複群組數", mode: "模式", purpose: "用途",
};

function summarizeOperationDetails(details: string | null | undefined) {
  if (!details) return "—";
  try {
    const parsed = JSON.parse(details);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return String(parsed);
    const items = Object.entries(parsed)
      .filter(([key]) => !/password|token|secret|code/i.test(key))
      .slice(0, 3)
      .map(([key, value]) => `${detailLabels[key] || key}：${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
    return items.length ? items.join("；") : "已記錄";
  } catch {
    return details.length > 120 ? `${details.slice(0, 120)}…` : details;
  }
}

function hasValidAuditPinSession() {
  if (typeof window === "undefined") return false;
  const verifiedAt = Number(window.sessionStorage.getItem(AUDIT_PIN_SESSION_KEY));
  const isValid = Number.isFinite(verifiedAt) && Date.now() - verifiedAt < PIN_VALIDITY_MS;
  if (!isValid) window.sessionStorage.removeItem(AUDIT_PIN_SESSION_KEY);
  return isValid;
}

function isPinVerificationExpired(error: unknown) {
  const trpcError = error as { message?: string; data?: { code?: string } } | null | undefined;
  return trpcError?.data?.code === "UNAUTHORIZED" || trpcError?.message?.includes("PIN 碼驗證失效") === true;
}

function isLockedLoginEvent(log: { failureReason?: string | null }) {
  return /鎖定|lock/i.test(log.failureReason ?? "");
}

function RiskBadge({ risk }: { risk: AuditRisk }) {
  if (risk.level === "none") return <span className="text-xs text-muted-foreground">—</span>;
  const highRisk = risk.level === "high";
  return (
    <Badge className={highRisk ? "border border-red-400/40 bg-red-500/20 text-red-200" : "border border-amber-400/40 bg-amber-500/20 text-amber-200"}>
      <AlertTriangle className="mr-1" size={12} />{risk.label}
    </Badge>
  );
}

function LoginMethodBadge({ method }: { method?: "password" | "passkey" | null }) {
  const passkey = method === "passkey";
  return <Badge className={passkey ? "border border-sky-400/40 bg-sky-500/15 text-sky-200" : "border border-slate-400/35 bg-slate-500/15 text-slate-200"}><KeyRound className="mr-1" size={12} />{passkey ? "通行密鑰" : "密碼"}</Badge>;
}

function maskAuditIpAddress(ipAddress: string) {
  if (ipAddress.includes(".")) {
    const segments = ipAddress.split(".");
    return segments.length === 4 ? `${segments[0]}.${segments[1]}.•••.•••` : "•••.•••.•••.•••";
  }
  if (ipAddress.includes(":")) {
    const segments = ipAddress.split(":").filter(Boolean);
    return `${segments.slice(0, 2).join(":") || "••••"}:••••:••••`;
  }
  return "••••••••";
}

function AuditIpAddress({ ipAddress }: { ipAddress?: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const hasRecordedReveal = React.useRef(false);
  const recordFullIpView = trpc.protectedAccountSecurity.recordFullIpView.useMutation();
  const reveal = () => {
    setRevealed(true);
    if (!hasRecordedReveal.current) {
      hasRecordedReveal.current = true;
      recordFullIpView.mutate({ sourceType: "auditCenter" });
    }
  };
  if (!ipAddress) return <>-</>;
  return <span tabIndex={0} data-testid="masked-audit-ip" onMouseEnter={reveal} onMouseLeave={() => setRevealed(false)} onFocus={reveal} onBlur={() => setRevealed(false)} className="cursor-help font-mono text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={revealed ? "完整 IP 位址" : "IP 位址已遮罩；滑鼠停留或鍵盤聚焦以顯示"}>{revealed ? ipAddress : maskAuditIpAddress(ipAddress)}</span>;
}

export default function AuditCenter() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const activeView = location.endsWith("/operation") ? "operation" : location.endsWith("/accounts") ? "accounts" : location.endsWith("/ip-blacklist") ? "ip-blacklist" : location.endsWith("/system-mode") ? "system-mode" : "login";
  const [pinVerified, setPinVerified] = useState(hasValidAuditPinSession);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [loginPage, setLoginPage] = useState(1);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginStatus, setLoginStatus] = useState<"all" | "success" | "failed">("all");
  const [loginStartDate, setLoginStartDate] = useState("");
  const [loginEndDate, setLoginEndDate] = useState("");
  const [loginHighRiskOnly, setLoginHighRiskOnly] = useState(false);
  const [loginLockedEventsOnly, setLoginLockedEventsOnly] = useState(false);
  const [highRiskSummaryPeriod, setHighRiskSummaryPeriod] = useState<keyof typeof summaryPeriodLabels>("24h");
  const [operationPage, setOperationPage] = useState(1);
  const [operationUsername, setOperationUsername] = useState("");
  const [operationAction, setOperationAction] = useState("all");
  const [operationEntity, setOperationEntity] = useState("all");
  const [operationRiskOnly, setOperationRiskOnly] = useState(false);
  const [operationDeduplicationOnly, setOperationDeduplicationOnly] = useState(false);
  const [accountLifecyclePage, setAccountLifecyclePage] = useState(1);
  const [accountLifecycleUsername, setAccountLifecycleUsername] = useState("");
  const [accountLifecycleAction, setAccountLifecycleAction] = useState("all");
  const [blacklistIp, setBlacklistIp] = useState("");
  const [blacklistNote, setBlacklistNote] = useState("");
  const [resolutionTarget, setResolutionTarget] = useState<{ sourceType: "loginAudit" | "operationLog"; sourceEventId: number; status: "in_progress" | "closed"; note: string } | null>(null);
  const [notificationTarget, setNotificationTarget] = useState<{ sourceType: "loginAudit" | "operationLog"; sourceEventId: number } | null>(null);
  const verifyPinMutation = trpc.auditPin.verify.useMutation();

  const loginAuditInput = useMemo(() => ({
    page: loginPage,
    pageSize: 50,
    username: loginUsername || undefined,
    status: loginStatus === "all" ? undefined : loginStatus,
    startDate: loginStartDate ? new Date(`${loginStartDate}T00:00:00`) : undefined,
    endDate: loginEndDate ? new Date(`${loginEndDate}T23:59:59.999`) : undefined,
  }), [loginEndDate, loginPage, loginStartDate, loginStatus, loginUsername]);

  const loginAudit = trpc.loginAudit.list.useQuery(loginAuditInput, { enabled: pinVerified && activeView === "login" });
  const highRiskSummary = trpc.loginAudit.highRiskSummary.useQuery({ period: highRiskSummaryPeriod }, {
    enabled: pinVerified,
    refetchInterval: 60_000,
  });

  const operationLogInput = useMemo(() => activeView === "accounts" ? ({
    page: accountLifecyclePage,
    pageSize: 50,
    username: accountLifecycleUsername || undefined,
    action: accountLifecycleAction === "all" ? undefined : accountLifecycleAction,
    accountLifecycleOnly: true,
  }) : ({
    page: operationPage,
    pageSize: 50,
    username: operationUsername || undefined,
    action: operationAction === "all" ? undefined : operationAction,
    entityType: operationEntity === "all" ? undefined : operationEntity,
    deduplicationOnly: operationDeduplicationOnly || undefined,
  }), [accountLifecycleAction, accountLifecyclePage, accountLifecycleUsername, activeView, operationAction, operationDeduplicationOnly, operationEntity, operationPage, operationUsername]);
  const operationLogs = trpc.operationLogs.list.useQuery(operationLogInput, { enabled: pinVerified && (activeView === "operation" || activeView === "accounts") });
  const ipBlacklist = trpc.ipBlacklist.list.useQuery(undefined, { enabled: pinVerified && activeView === "ip-blacklist" });
  const systemModeHistoryQuery = trpc.systemMaintenance.history.useQuery(undefined, { enabled: pinVerified && activeView === "system-mode" }) ?? { data: [], isLoading: false, error: null };
  const systemModeHistory = { ...systemModeHistoryQuery, data: (systemModeHistoryQuery.data ?? []).map((entry: any) => ({ ...entry, username: entry.displayName || entry.username })) };
  const saveIpBlacklist = trpc.ipBlacklist.save.useMutation({ onSuccess: () => { setBlacklistIp(""); setBlacklistNote(""); void ipBlacklist.refetch(); } });
  const setIpBlacklistActive = trpc.ipBlacklist.setActive.useMutation({ onSuccess: () => { void ipBlacklist.refetch(); } });

  const visibleLoginLogs = useMemo(() => {
    const logs = (loginAudit.data?.logs ?? []).map((log: any) => ({ ...log, username: log.displayName || log.username }));
    return logs.filter((log: any) => {
      if (loginHighRiskOnly && getLoginRisk(log).level !== "high") return false;
      return !loginLockedEventsOnly || isLockedLoginEvent(log);
    });
  }, [loginAudit.data?.logs, loginHighRiskOnly, loginLockedEventsOnly]);

  const visibleOperationLogs = useMemo(() => {
    const logs = (operationLogs.data?.logs ?? []).map((log: any) => ({ ...log, username: log.displayName || log.username }));
    return operationRiskOnly ? logs.filter((log: any) => isRiskEvent(getOperationRisk(log))) : logs;
  }, [operationLogs.data?.logs, operationRiskOnly]);
  const resolutionEvents = useMemo(() => [
    ...visibleLoginLogs.filter((log: any) => isRiskEvent(getLoginRisk(log))).map((log: any) => ({ sourceType: "loginAudit" as const, sourceEventId: log.id })),
    ...visibleOperationLogs.filter((log: any) => isRiskEvent(getOperationRisk(log))).map((log: any) => ({ sourceType: "operationLog" as const, sourceEventId: log.id })),
  ], [visibleLoginLogs, visibleOperationLogs]);
  const eventResolutions = trpc.auditEventResolutions.list.useQuery({ events: resolutionEvents }, { enabled: pinVerified && resolutionEvents.length > 0 }) ?? { data: [], error: null, refetch: () => undefined };
  const resolutionMap = useMemo(() => new Map((eventResolutions.data ?? []).map((item: any) => [`${item.sourceType}:${item.sourceEventId}`, item])), [eventResolutions.data]);
  const saveResolution = trpc.auditEventResolutions.save.useMutation({
    onSuccess: () => { void eventResolutions.refetch(); setResolutionTarget(null); },
  });
  const notificationDeliveryInput = useMemo(() => ({ sourceType: notificationTarget?.sourceType ?? "loginAudit" as const, sourceEventId: notificationTarget?.sourceEventId ?? 0 }), [notificationTarget]);
  const notificationDeliveries = trpc.auditEventResolutions.notificationDeliveries.useQuery(notificationDeliveryInput, { enabled: Boolean(notificationTarget) });
  const resendClosureNotification = trpc.auditEventResolutions.resendClosureNotification.useMutation({
    onSuccess: () => { void notificationDeliveries.refetch(); },
  });

  useEffect(() => {
    const activeError = highRiskSummary.error ?? (activeView === "login" ? loginAudit.error : activeView === "operation" || activeView === "accounts" ? operationLogs.error : activeView === "system-mode" ? systemModeHistory.error : ipBlacklist.error);
    if (!isPinVerificationExpired(activeError)) return;
    window.sessionStorage.removeItem(AUDIT_PIN_SESSION_KEY);
    setPinVerified(false);
    setPinDialogOpen(true);
  }, [activeView, eventResolutions.error, highRiskSummary.error, ipBlacklist?.error, loginAudit.error, operationLogs.error, systemModeHistory.error]);

  const switchView = (view: "login" | "operation" | "accounts" | "ip-blacklist" | "system-mode") => setLocation(`/audit-center/${view}`);
  const completePinVerification = () => {
    window.sessionStorage.setItem(AUDIT_PIN_SESSION_KEY, Date.now().toString());
    setPinVerified(true);
    setPinDialogOpen(false);
  };

  if (!user?.isFounder) {
    return <div className="space-y-6"><div><h1 className="page-title">稽核中心</h1><p className="page-subtitle">AUDIT CENTER</p></div><Card className="border border-red-500/40 bg-red-950/20"><CardContent className="flex items-center gap-3 pt-6 text-red-200"><ShieldAlert size={22} />僅創始管理員可以查看稽核中心</CardContent></Card></div>;
  }

  if (!pinVerified) {
    return <><div className="space-y-6"><div><h1 className="page-title">稽核中心</h1><p className="page-subtitle">AUDIT CENTER</p></div><Card className="max-w-lg"><CardHeader><CardTitle>PIN 碼驗證</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">登入稽核與操作日誌屬於敏感資料，請先驗證 PIN 碼</p><Button onClick={() => setPinDialogOpen(true)}><KeyRound className="mr-2" size={16} />驗證 PIN 碼</Button></CardContent></Card></div><AuditPinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} onSuccess={completePinVerification} onVerify={async (pin) => { await verifyPinMutation.mutateAsync({ pin }); }} /></>;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">稽核中心</h1><p className="page-subtitle">AUDIT CENTER · LOGIN &amp; SYSTEM ACTIVITY</p></div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="稽核中心類型">
        <Button variant={activeView === "login" ? "default" : "outline"} size="sm" role="tab" aria-selected={activeView === "login"} onClick={() => switchView("login")}><History className="mr-2" size={15} />登入稽核</Button>
        <Button variant={activeView === "operation" ? "default" : "outline"} size="sm" role="tab" aria-selected={activeView === "operation"} onClick={() => switchView("operation")}><ClipboardList className="mr-2" size={15} />操作日誌</Button>
        <Button variant={activeView === "accounts" ? "default" : "outline"} size="sm" role="tab" aria-selected={activeView === "accounts"} onClick={() => switchView("accounts")}><UserRoundSearch className="mr-2" size={15} />帳號歷程</Button>
        <Button variant={activeView === "system-mode" ? "default" : "outline"} size="sm" role="tab" aria-selected={activeView === "system-mode"} onClick={() => switchView("system-mode")}><Power className="mr-2" size={15} />系統模式歷程</Button>
        <Button variant={activeView === "ip-blacklist" ? "default" : "outline"} size="sm" role="tab" aria-selected={activeView === "ip-blacklist"} onClick={() => switchView("ip-blacklist")}><Ban className="mr-2" size={15} />IP 黑名單</Button>
      </div>

      <Card className="border-red-500/25 bg-red-950/10">
        <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="text-red-300" size={18} />近 {summaryPeriodLabels[highRiskSummaryPeriod]}高風險摘要</CardTitle><div className="flex w-full gap-1 sm:w-auto" aria-label="高風險摘要時間區間">{(Object.keys(summaryPeriodLabels) as Array<keyof typeof summaryPeriodLabels>).map((period) => <Button key={period} size="sm" variant={highRiskSummaryPeriod === period ? "default" : "outline"} onClick={() => setHighRiskSummaryPeriod(period)} aria-pressed={highRiskSummaryPeriod === period}>{summaryPeriodLabels[period]}</Button>)}</div></CardHeader>
        <CardContent>
          {highRiskSummary.isLoading ? (
            <p className="text-sm text-muted-foreground">正在彙整高風險事件…</p>
          ) : highRiskSummary.error ? (
            <p className="text-sm text-red-300">摘要載入失敗：{highRiskSummary.error.message}</p>
          ) : (
            <div className="space-y-3">
              {highRiskSummary.data?.lockedEventWarning?.triggered && <div role="alert" className="flex items-start gap-2 border border-red-400/45 bg-red-500/15 p-3 text-sm text-red-100"><AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={16} /><p>安全警告：此區間偵測到 {highRiskSummary.data.lockedEventWarning.lockedEventCount} 次帳號鎖定事件，已達門檻 {highRiskSummary.data.lockedEventWarning.threshold} 次請優先檢視可疑 IP 與登入紀錄</p></div>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-red-400/25 bg-background/40 p-3"><p className="text-xs text-muted-foreground">高風險登入事件</p><p className="mt-1 text-2xl font-bold text-red-200">{highRiskSummary.data?.highRiskLoginCount ?? 0}</p></div>
                <div className="rounded-md border border-red-400/25 bg-background/40 p-3"><p className="text-xs text-muted-foreground">鎖定事件</p><p className="mt-1 text-2xl font-bold text-red-200">{highRiskSummary.data?.lockedLoginEventCount ?? 0}</p></div>
                <div className="rounded-md border border-amber-400/25 bg-background/40 p-3"><p className="text-xs text-muted-foreground">目前鎖定帳號</p><p className="mt-1 text-2xl font-bold text-amber-200">{highRiskSummary.data?.activeLockedAccountCount ?? 0}</p></div>
                <div className="rounded-md border border-red-400/25 bg-background/40 p-3"><p className="text-xs text-muted-foreground">高風險操作事件</p><p className="mt-1 text-2xl font-bold text-red-200">{highRiskSummary.data?.highRiskOperationCount ?? 0}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {activeView === "login" ? (
        <>
          <Card><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_200px_170px_170px_auto]">
            <div><label className="mb-2 block text-sm font-medium">帳號搜尋</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} /><Input className="pl-9" placeholder="輸入帳號名稱" value={loginUsername} onChange={(event) => { setLoginUsername(event.target.value); setLoginPage(1); }} /></div></div>
            <div><label className="mb-2 block text-sm font-medium">登入狀態</label><Select value={loginStatus} onValueChange={(value) => { setLoginStatus(value as typeof loginStatus); setLoginPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部狀態</SelectItem><SelectItem value="success">成功</SelectItem><SelectItem value="failed">失敗</SelectItem></SelectContent></Select></div>
            <div><label htmlFor="login-start-date" className="mb-2 block text-sm font-medium">開始日期</label><Input id="login-start-date" type="date" value={loginStartDate} onChange={(event) => { setLoginStartDate(event.target.value); setLoginPage(1); }} /></div>
            <div><label htmlFor="login-end-date" className="mb-2 block text-sm font-medium">結束日期</label><Input id="login-end-date" type="date" value={loginEndDate} min={loginStartDate || undefined} onChange={(event) => { setLoginEndDate(event.target.value); setLoginPage(1); }} /></div>
            <Button variant="outline" className="self-end" onClick={() => { setLoginUsername(""); setLoginStatus("all"); setLoginStartDate(""); setLoginEndDate(""); setLoginHighRiskOnly(false); setLoginLockedEventsOnly(false); setLoginPage(1); }}>重置</Button>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-5"><div className="flex items-center gap-2"><Checkbox id="login-high-risk-only" checked={loginHighRiskOnly} onCheckedChange={(checked) => setLoginHighRiskOnly(checked === true)} /><label htmlFor="login-high-risk-only" className="text-sm font-medium">僅顯示本頁高風險登入</label></div><Button variant={loginLockedEventsOnly ? "default" : "outline"} size="sm" onClick={() => setLoginLockedEventsOnly((value) => !value)} aria-pressed={loginLockedEventsOnly}><LockKeyhole className="mr-2" size={14} />僅顯示高風險鎖定事件</Button><span className="text-xs text-muted-foreground">五分鐘內連續三次失敗會自動鎖定帳號 15 分鐘，並以紅色高風險標記；一般失敗登入仍會以黃色醒目</span></div>
          </CardContent></Card>
          {loginAudit.error ? <Card className="border-red-500/40"><CardContent className="pt-6 text-red-300">載入失敗：{loginAudit.error.message}</CardContent></Card> : loginAudit.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">載入登入稽核中…</CardContent></Card> : <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>姓名（登入帳號）</TableHead><TableHead>狀態</TableHead><TableHead>登入方式</TableHead><TableHead>風險</TableHead><TableHead>失敗原因</TableHead><TableHead>IP 位址</TableHead><TableHead>登入時間</TableHead><TableHead>處理狀態</TableHead></TableRow></TableHeader><TableBody>{visibleLoginLogs.length ? visibleLoginLogs.map((log: any) => { const risk = getLoginRisk(log); const resolution = resolutionMap.get(`loginAudit:${log.id}`); return <TableRow key={log.id} className={risk.level === "high" ? "bg-red-950/25" : risk.level === "warning" ? "bg-amber-950/15" : undefined}><TableCell className="font-medium">{formatAuditActor(log)}</TableCell><TableCell>{log.status === "success" ? <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle size={14} />成功</span> : <span className="inline-flex items-center gap-1 text-red-400"><XCircle size={14} />失敗</span>}</TableCell><TableCell><LoginMethodBadge method={log.loginMethod} /></TableCell><TableCell><RiskBadge risk={risk} /></TableCell><TableCell>{log.failureReason || "-"}</TableCell><TableCell><AuditIpAddress ipAddress={log.ipAddress} /></TableCell><TableCell>{new Date(log.loginAt).toLocaleString("zh-TW")}</TableCell><TableCell>{risk.level === "none" ? "—" : <div className="space-y-1"><Badge className={resolution?.status === "closed" ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border border-amber-400/40 bg-amber-500/15 text-amber-200"}>{resolution?.status === "closed" ? "已結案" : resolution ? "處理中" : "待處理"}</Badge>{resolution?.handlingNote && <p className="max-w-36 truncate text-xs text-muted-foreground" title={resolution.handlingNote}>{resolution.handlingNote}</p>}<Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setResolutionTarget({ sourceType: "loginAudit", sourceEventId: log.id, status: resolution?.status ?? "in_progress", note: resolution?.handlingNote ?? "" })}>{resolution ? "更新" : "處理"}</Button></div>}</TableCell></TableRow>; }) : <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">沒有符合條件的登入稽核紀錄</TableCell></TableRow>}</TableBody></Table></Card>}
        </>
      ) : activeView === "operation" ? (
        <>
          <Card><CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <div><label className="mb-2 block text-sm font-medium">帳號搜尋</label><Input placeholder="搜尋帳號" value={operationUsername} onChange={(event) => { setOperationUsername(event.target.value); setOperationPage(1); }} /></div>
            <div><label className="mb-2 block text-sm font-medium">操作類型</label><Select value={operationAction} onValueChange={(value) => { setOperationAction(value); setOperationPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="create">新增</SelectItem><SelectItem value="update">修改</SelectItem><SelectItem value="delete">刪除</SelectItem><SelectItem value="activate">啟用</SelectItem><SelectItem value="deactivate">停用</SelectItem><SelectItem value="resetPassword">重置密碼</SelectItem><SelectItem value="loginChallengeExpired">登入驗證挑戰逾時</SelectItem><SelectItem value="approve">核准申請</SelectItem><SelectItem value="reject">拒絕申請</SelectItem><SelectItem value="cancel">取消申請</SelectItem><SelectItem value="return">歸還</SelectItem><SelectItem value="viewBorrowRequests">查看借用申請</SelectItem><SelectItem value="viewUserManagement">查看帳號管理</SelectItem></SelectContent></Select></div>
            <div><label className="mb-2 block text-sm font-medium">資源類型</label><Select value={operationEntity} onValueChange={(value) => { setOperationEntity(value); setOperationPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="equipment">器材</SelectItem><SelectItem value="user">帳號管理</SelectItem><SelectItem value="borrowRequest">借用申請</SelectItem><SelectItem value="borrowRecord">借用記錄</SelectItem><SelectItem value="accountSecurity">帳號安全</SelectItem><SelectItem value="auditView">稽核／管理查看</SelectItem></SelectContent></Select></div>
            <Button variant="outline" className="self-end" onClick={() => { setOperationUsername(""); setOperationAction("all"); setOperationEntity("all"); setOperationRiskOnly(false); setOperationDeduplicationOnly(false); setOperationPage(1); }}>重置</Button>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-4"><div className="flex items-center gap-2"><Checkbox id="operation-risk-only" checked={operationRiskOnly} onCheckedChange={(checked) => setOperationRiskOnly(checked === true)} /><label htmlFor="operation-risk-only" className="text-sm font-medium">僅顯示本頁高風險操作</label></div><div className="flex items-center gap-2"><Checkbox id="operation-deduplication-only" checked={operationDeduplicationOnly} onCheckedChange={(checked) => { setOperationDeduplicationOnly(checked === true); setOperationPage(1); }} /><label htmlFor="operation-deduplication-only" className="text-sm font-medium">僅顯示去重維護操作</label></div><span className="text-xs text-muted-foreground">去重篩選會顯示手動掃描與逐筆停用重複帳號；刪除、重置密碼與停用操作會列為高風險</span></div>
          </CardContent></Card>
          {operationLogs.error ? <Card className="border-red-500/40"><CardContent className="pt-6 text-red-300">載入失敗：{operationLogs.error.message}</CardContent></Card> : operationLogs.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">載入操作日誌中…</CardContent></Card> : <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>時間</TableHead><TableHead>姓名（登入帳號）</TableHead><TableHead>操作</TableHead><TableHead>風險</TableHead><TableHead>資源類型</TableHead><TableHead>資源名稱</TableHead><TableHead>執行內容</TableHead><TableHead>IP 位址</TableHead><TableHead>處理狀態</TableHead></TableRow></TableHeader><TableBody>{visibleOperationLogs.length ? visibleOperationLogs.map((log: any) => { const risk = getOperationRisk(log); const detailSummary = summarizeOperationDetails(log.details); const resolution = resolutionMap.get(`operationLog:${log.id}`); return <TableRow key={log.id} className={risk.level === "high" ? "bg-red-950/25" : undefined}><TableCell>{new Date(log.createdAt).toLocaleString("zh-TW")}</TableCell><TableCell className="font-medium">{formatAuditActor(log)}</TableCell><TableCell>{operationLabels[log.action] || log.action}</TableCell><TableCell><RiskBadge risk={risk} /></TableCell><TableCell>{log.entityType}</TableCell><TableCell>{log.entityName || "-"}</TableCell><TableCell className="max-w-[280px] truncate" title={detailSummary}>{detailSummary}</TableCell><TableCell><AuditIpAddress ipAddress={log.ipAddress} /></TableCell><TableCell>{risk.level === "none" ? "—" : <div className="space-y-1"><Badge className={resolution?.status === "closed" ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border border-amber-400/40 bg-amber-500/15 text-amber-200"}>{resolution?.status === "closed" ? "已結案" : resolution ? "處理中" : "待處理"}</Badge>{resolution?.handlingNote && <p className="max-w-36 truncate text-xs text-muted-foreground" title={resolution.handlingNote}>{resolution.handlingNote}</p>}<Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setResolutionTarget({ sourceType: "operationLog", sourceEventId: log.id, status: resolution?.status ?? "in_progress", note: resolution?.handlingNote ?? "" })}>{resolution ? "更新" : "處理"}</Button></div>}</TableCell></TableRow>; }) : <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">沒有符合條件的操作日誌</TableCell></TableRow>}</TableBody></Table></Card>}
        </>
      ) : activeView === "accounts" ? (
        <>
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserRoundSearch size={18} />帳號建立與刪除歷程</CardTitle><p className="text-sm text-muted-foreground">此檢視器聚焦帳號建立、單筆刪除、批次測試帳號狀態調整與快速清理事件；不會顯示密碼或驗證碼</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_200px_auto]"><div><label className="mb-2 block text-sm font-medium">管理員或目標姓名搜尋</label><Input placeholder="搜尋執行人員姓名或帳號" value={accountLifecycleUsername} onChange={(event) => { setAccountLifecycleUsername(event.target.value); setAccountLifecyclePage(1); }} /></div><div><label className="mb-2 block text-sm font-medium">歷程類型</label><Select value={accountLifecycleAction} onValueChange={(value) => { setAccountLifecycleAction(value); setAccountLifecyclePage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部帳號歷程</SelectItem><SelectItem value="create">建立帳號</SelectItem><SelectItem value="delete">刪除帳號</SelectItem><SelectItem value="bulkTestAccountStatus">批次處理測試帳號</SelectItem><SelectItem value="cleanupTestAccounts">快速清理測試帳號</SelectItem></SelectContent></Select></div><Button variant="outline" className="self-end" onClick={() => { setAccountLifecycleUsername(""); setAccountLifecycleAction("all"); setAccountLifecyclePage(1); }}>重置</Button></CardContent></Card>
          {operationLogs.error ? <Card className="border-red-500/40"><CardContent className="pt-6 text-red-300">載入失敗：{operationLogs.error.message}</CardContent></Card> : operationLogs.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">載入帳號歷程中…</CardContent></Card> : <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>時間</TableHead><TableHead>姓名（登入帳號）</TableHead><TableHead>事件</TableHead><TableHead>目標帳號／作業</TableHead><TableHead>摘要</TableHead></TableRow></TableHeader><TableBody>{operationLogs.data?.logs?.length ? operationLogs.data.logs.map((log: any) => <TableRow key={log.id}><TableCell>{new Date(log.createdAt).toLocaleString("zh-TW")}</TableCell><TableCell className="font-medium">{formatAuditActor(log)}</TableCell><TableCell>{operationLabels[log.action] || log.action}</TableCell><TableCell>{log.entityName || "—"}</TableCell><TableCell className="max-w-[420px] truncate" title={summarizeOperationDetails(log.details)}>{summarizeOperationDetails(log.details)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">沒有符合條件的帳號歷程</TableCell></TableRow>}</TableBody></Table></Card>}
        </>
      ) : activeView === "system-mode" ? (
        <Card className="overflow-hidden" data-testid="system-mode-history-panel">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Power className="text-cyan-300" size={18} />系統模式歷程</CardTitle><p className="mt-1 text-sm text-muted-foreground">顯示維護、離線、恢復與預告操作；限制模式的強制登出數依工作階段安全稽核事件統計</p></div><Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-100">強制登出 {systemModeHistory.data?.reduce((total, entry) => total + entry.forcedLogoutCount, 0) ?? 0} 人次</Badge></CardHeader>
          <CardContent className="p-0">{systemModeHistory.error ? <div className="p-6 text-sm text-red-300">載入失敗：{systemModeHistory.error.message}</div> : systemModeHistory.isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">正在彙整系統模式歷程…</div> : <Table><TableHeader><TableRow><TableHead>有效時間</TableHead><TableHead>姓名（登入帳號）</TableHead><TableHead>事件</TableHead><TableHead>系統模式</TableHead><TableHead>強制登出</TableHead></TableRow></TableHeader><TableBody>{systemModeHistory.data?.length ? systemModeHistory.data.map((entry) => <TableRow key={entry.id}><TableCell>{new Date(entry.effectiveAt).toLocaleString("zh-TW")}</TableCell><TableCell className="font-medium">{formatAuditActor(entry)}</TableCell><TableCell>{operationLabels[entry.action] || entry.action}</TableCell><TableCell>{entry.systemMode ? <Badge className={entry.systemMode === "online" ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-100" : entry.systemMode === "maintenance" ? "border border-amber-400/35 bg-amber-500/15 text-amber-100" : "border border-rose-400/35 bg-rose-500/15 text-rose-100"}>{systemModeHistoryLabels[entry.systemMode]}</Badge> : "—"}</TableCell><TableCell>{entry.systemMode === "maintenance" || entry.systemMode === "offline" ? <span className="font-mono font-semibold text-amber-200">{entry.forcedLogoutCount} 人次</span> : "—"}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">尚無系統模式歷程</TableCell></TableRow>}</TableBody></Table>}</CardContent>
        </Card>
      ) : null}
      {activeView === "ip-blacklist" && <div className="space-y-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Ban size={18} />封鎖可疑 IP</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-[220px_1fr_auto]"><div><label htmlFor="blacklist-ip-address" className="mb-2 block text-sm font-medium">IP 位址</label><Input id="blacklist-ip-address" placeholder="例如 203.0.113.5" value={blacklistIp} onChange={(event) => setBlacklistIp(event.target.value)} /></div><div><label htmlFor="blacklist-note" className="mb-2 block text-sm font-medium">管理備註</label><Input id="blacklist-note" placeholder="例如：多次暴力登入嘗試" value={blacklistNote} onChange={(event) => setBlacklistNote(event.target.value)} /></div><Button className="self-end" disabled={!blacklistIp.trim() || saveIpBlacklist.isPending} onClick={() => saveIpBlacklist.mutate({ ipAddress: blacklistIp.trim(), note: blacklistNote.trim() || undefined, isActive: true })}>{saveIpBlacklist.isPending ? "儲存中..." : "加入並啟用"}</Button><p className="text-xs text-muted-foreground md:col-span-3">加入後，該 IP 的登入會在密碼驗證前遭到封鎖，且系統會記錄稽核事件並發送安全通知</p></CardContent></Card>
        {ipBlacklist.error ? <Card className="border-red-500/40"><CardContent className="pt-6 text-red-300">黑名單載入失敗：{ipBlacklist.error.message}</CardContent></Card> : ipBlacklist.isLoading ? <Card><CardContent className="py-10 text-center text-muted-foreground">正在載入 IP 黑名單…</CardContent></Card> : <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>IP 位址</TableHead><TableHead>備註</TableHead><TableHead>建立時間</TableHead><TableHead>狀態</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{ipBlacklist.data?.length ? ipBlacklist.data.map((entry) => <TableRow key={entry.id}><TableCell className="font-mono font-medium">{entry.ipAddress}</TableCell><TableCell>{entry.note || "—"}</TableCell><TableCell>{new Date(entry.updatedAt).toLocaleString("zh-TW")}</TableCell><TableCell>{entry.isActive ? <Badge className="border border-red-400/40 bg-red-500/20 text-red-200">封鎖中</Badge> : <Badge variant="outline">已停用</Badge>}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" disabled={setIpBlacklistActive.isPending} onClick={() => setIpBlacklistActive.mutate({ id: entry.id, isActive: !entry.isActive })}>{entry.isActive ? "解除封鎖" : "重新啟用"}</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">尚未建立 IP 黑名單規則</TableCell></TableRow>}</TableBody></Table></Card>}
      </div>}
      <Dialog open={Boolean(resolutionTarget)} onOpenChange={(open) => { if (!open && !saveResolution.isPending) setResolutionTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>異常事件處理</DialogTitle><DialogDescription>處理註記會顯示於稽核中心；首次選擇結案時，系統會記錄結案時間與處理人員，並通知相關管理員</DialogDescription></DialogHeader>
          {resolutionTarget && <div className="space-y-4"><div><label htmlFor="audit-event-handling-note" className="mb-2 block text-sm font-medium">處理註記</label><textarea id="audit-event-handling-note" className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={resolutionTarget.note} onChange={(event) => setResolutionTarget({ ...resolutionTarget, note: event.target.value })} placeholder="例如：已確認來源、已封鎖 IP、已通知相關人員" maxLength={1000} /></div><div><label className="mb-2 block text-sm font-medium">處理狀態</label><Select value={resolutionTarget.status} onValueChange={(value) => setResolutionTarget({ ...resolutionTarget, status: value as "in_progress" | "closed" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in_progress">處理中</SelectItem><SelectItem value="closed">結案</SelectItem></SelectContent></Select></div></div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionTarget(null)} disabled={saveResolution.isPending}>取消</Button>
            {resolutionTarget && resolutionMap.get(`${resolutionTarget.sourceType}:${resolutionTarget.sourceEventId}`)?.status === "closed" && <Button variant="outline" onClick={() => { setNotificationTarget({ sourceType: resolutionTarget.sourceType, sourceEventId: resolutionTarget.sourceEventId }); setResolutionTarget(null); }} disabled={saveResolution.isPending}><Mail className="mr-2" size={15} />通知送達紀錄</Button>}
            <Button onClick={() => resolutionTarget && saveResolution.mutate({ sourceType: resolutionTarget.sourceType, sourceEventId: resolutionTarget.sourceEventId, status: resolutionTarget.status, handlingNote: resolutionTarget.note.trim() })} disabled={!resolutionTarget?.note.trim() || saveResolution.isPending}>{saveResolution.isPending ? "儲存中…" : resolutionTarget?.status === "closed" ? "儲存並結案" : "儲存註記"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(notificationTarget)} onOpenChange={(open) => { if (!open && !resendClosureNotification.isPending) setNotificationTarget(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail size={18} />結案通知送達紀錄</DialogTitle><DialogDescription>顯示系統警示郵件的送達狀態；收件資訊已遮罩補發會通知管理員並建立新的寄送紀錄</DialogDescription></DialogHeader>{notificationTarget && <div className="space-y-4 pt-2">{notificationDeliveries.isLoading ? <p className="text-sm text-muted-foreground">正在載入送達紀錄…</p> : notificationDeliveries.error ? <p role="alert" className="border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{notificationDeliveries.error.message || "送達紀錄載入失敗"}</p> : notificationDeliveries.data?.length ? <div className="max-h-64 space-y-2 overflow-y-auto">{notificationDeliveries.data.map((delivery) => <div key={delivery.id} className="border border-border bg-muted/20 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{delivery.recipientEmail}</span><Badge className={delivery.status === "sent" ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : delivery.status === "failed" ? "border border-red-400/40 bg-red-500/15 text-red-200" : "border border-amber-400/40 bg-amber-500/15 text-amber-200"}>{delivery.status === "sent" ? "已送達" : delivery.status === "failed" ? "寄送失敗" : "已略過"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{new Date(delivery.createdAt).toLocaleString("zh-TW", { hour12: false })}</p>{delivery.errorDetail && <p className="mt-2 text-xs text-red-200">{delivery.errorDetail}</p>}</div>)}</div> : <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">尚無電子郵件送達紀錄；專案管理通知可能已另行傳送</p>}<Button className="w-full" disabled={resendClosureNotification.isPending} onClick={() => resendClosureNotification.mutate(notificationTarget)}><RotateCcw className="mr-2" size={15} />{resendClosureNotification.isPending ? "補發中…" : "手動補發結案通知"}</Button></div>}</DialogContent>
      </Dialog>
      <AuditPinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} onSuccess={completePinVerification} onVerify={async (pin) => { await verifyPinMutation.mutateAsync({ pin }); }} />
    </div>
  );
}
