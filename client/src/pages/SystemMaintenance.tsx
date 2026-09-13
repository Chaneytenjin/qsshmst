import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BellRing, CalendarClock, CircleCheck, CircleOff, Copy, History, KeyRound, MailCheck, Plus, Power, RefreshCw, ShieldAlert, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SystemMode = "online" | "maintenance" | "offline";
type AuthorizedSenderDraft = { key: string; email: string; label: string; isActive: boolean };

const SYSTEM_MODE_COPY: Record<SystemMode, { label: string; description: string; loginRule: string }> = {
  online: {
    label: "SYSTEM ONLINE",
    description: "系統目前正常運作所有已啟用帳號可依既有權限完成登入",
    loginRule: "依帳號啟用、密碼、雙因素與角色規則登入",
  },
  maintenance: {
    label: "SYSTEM MAINTENANCE",
    description: "系統維護已啟用所有非創始管理員工作階段會被安全結束，且無法繼續登入",
    loginRule: "僅創始管理員可繼續存取；其他帳號會看到系統維護提示",
  },
  offline: {
    label: "SYSTEM OFFLINE",
    description: "系統離線已啟用所有非創始管理員工作階段會被安全結束，且無法繼續登入",
    loginRule: "僅創始管理員可繼續存取以恢復服務；其他帳號會看到系統離線提示",
  },
};

function toDateTimeInputValue(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string) {
  return value ? new Date(value) : null;
}

export default function SystemMaintenance() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<SystemMode>("online");
  const [announcement, setAnnouncement] = useState("");
  const [estimatedRestoredAt, setEstimatedRestoredAt] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [offlineCommandRecipient, setOfflineCommandRecipient] = useState("");
  const [authorizedSenders, setAuthorizedSenders] = useState<AuthorizedSenderDraft[]>([]);
  const [newAuthorizedSenderEmail, setNewAuthorizedSenderEmail] = useState("");
  const [newAuthorizedSenderLabel, setNewAuthorizedSenderLabel] = useState("");
  const [offlineCommandEnabled, setOfflineCommandEnabled] = useState(false);
  const [appsScriptSecret, setAppsScriptSecret] = useState<string | null>(null);
  const [appsScriptSecretOpen, setAppsScriptSecretOpen] = useState(false);
  const settings = trpc.systemMaintenance.settings.useQuery();
  const emailOfflineCommand = trpc.emailOfflineCommand.settings.useQuery();
  const emailOfflineCommandHistory = trpc.emailOfflineCommand.history.useQuery();
  const utils = trpc.useUtils();
  const setSystemMode = trpc.systemMaintenance.setMode.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        settings.refetch(),
        utils.systemMaintenance.status.invalidate(),
      ]);
      setConfirmOpen(false);
      toast.success(`${SYSTEM_MODE_COPY[result.systemMode].label} 已啟用`);
    },
    onError: (error) => toast.error(error.message || "無法更新系統維護狀態"),
  });
  const scheduleMode = trpc.systemMaintenance.scheduleMode.useMutation({
    onSuccess: async (result) => {
      await Promise.all([settings.refetch(), utils.systemMaintenance.status.invalidate()]);
      toast.success(`${SYSTEM_MODE_COPY[result.scheduledMode ?? "maintenance"].label} 預告已建立`);
    },
    onError: (error) => toast.error(error.message || "無法建立系統模式預告"),
  });
  const cancelScheduledMode = trpc.systemMaintenance.cancelScheduledMode.useMutation({
    onSuccess: async () => {
      await Promise.all([settings.refetch(), utils.systemMaintenance.status.invalidate()]);
      toast.success("系統模式預告已取消");
    },
    onError: (error) => toast.error(error.message || "無法取消系統模式預告"),
  });
  const saveEmailOfflineCommand = trpc.emailOfflineCommand.save.useMutation({
    onSuccess: async (result) => {
      await Promise.all([emailOfflineCommand.refetch(), emailOfflineCommandHistory.refetch()]);
      if (result.commandSecret) {
        setAppsScriptSecret(result.commandSecret);
        setAppsScriptSecretOpen(true);
      }
      toast.success(result.isEnabled ? "授權 Gmail 離線指令已啟用" : "Gmail 離線指令設定已儲存但尚未啟用");
    },
    onError: (error) => toast.error(error.message || "無法儲存授權郵件離線指令設定"),
  });

  const systemMode = settings.data?.systemMode ?? (settings.data?.maintenanceMode ? "maintenance" : "online");
  const currentModeCopy = SYSTEM_MODE_COPY[systemMode];
  const scheduledMode = settings.data?.scheduledMode ?? null;
  const scheduledModeCopy = scheduledMode ? SYSTEM_MODE_COPY[scheduledMode] : null;
  const appsScriptEndpoint = typeof window === "undefined"
    ? emailOfflineCommand.data?.appsScriptAutomation.endpointPath ?? "/api/integrations/gmail-offline-command"
    : `${window.location.origin}${emailOfflineCommand.data?.appsScriptAutomation.endpointPath ?? "/api/integrations/gmail-offline-command"}`;
  useEffect(() => {
    if (!settings.data) return;
    setAnnouncement(settings.data.announcement ?? "");
    setEstimatedRestoredAt(toDateTimeInputValue(settings.data.estimatedRestoredAt));
    setScheduledFor(toDateTimeInputValue(settings.data.scheduledFor));
  }, [settings.data]);
  useEffect(() => {
    if (!emailOfflineCommand.data) return;
    setOfflineCommandRecipient(emailOfflineCommand.data.recipientEmail ?? "");
    setAuthorizedSenders(emailOfflineCommand.data.authorizedSenders.map((sender) => ({
      key: String(sender.id),
      email: sender.email,
      label: sender.label ?? "",
      isActive: sender.isActive,
    })));
    setOfflineCommandEnabled(emailOfflineCommand.data.isEnabled);
  }, [emailOfflineCommand.data]);
  const requestModeChange = (mode: SystemMode) => {
    setTargetMode(mode);
    setConfirmOpen(true);
  };
  const mutateMode = () => setSystemMode.mutate({
    systemMode: targetMode,
    announcement: targetMode === "online" ? null : announcement.trim() || null,
    estimatedRestoredAt: targetMode === "online" ? null : parseLocalDateTime(estimatedRestoredAt),
  });
  const createSchedule = (mode: "maintenance" | "offline") => {
    const scheduledDate = parseLocalDateTime(scheduledFor);
    if (!scheduledDate) {
      toast.error("請設定維護或離線開始時間");
      return;
    }
    scheduleMode.mutate({
      systemMode: mode,
      scheduledFor: scheduledDate,
      announcement: announcement.trim() || null,
      estimatedRestoredAt: parseLocalDateTime(estimatedRestoredAt),
    });
  };
  const saveAuthorizedEmailCommand = (rotateCommandSecret: boolean) => {
    if (!offlineCommandRecipient.trim()) {
      toast.error("請設定系統通知 Gmail 收件地址");
      return;
    }
    if (!authorizedSenders.length) {
      toast.error("至少需要一個授權寄件者地址");
      return;
    }
    if (offlineCommandEnabled && !authorizedSenders.some((sender) => sender.isActive)) {
      toast.error("啟用 Gmail 離線指令時，至少需要一個已啟用的授權寄件者");
      return;
    }
    saveEmailOfflineCommand.mutate({
      recipientEmail: offlineCommandRecipient.trim(),
      authorizedSenders: authorizedSenders.map((sender) => ({
        email: sender.email.trim(),
        label: sender.label.trim() || null,
        isActive: sender.isActive,
      })),
      isEnabled: offlineCommandEnabled,
      rotateCommandSecret,
    });
  };
  const addAuthorizedSender = () => {
    const email = newAuthorizedSenderEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("請輸入有效的 Gmail 電子郵件地址");
      return;
    }
    if (authorizedSenders.some((sender) => sender.email.toLowerCase() === email)) {
      toast.error("此 Gmail 帳號已在授權清單中");
      return;
    }
    if (authorizedSenders.length >= 8) {
      toast.error("最多可管理八個授權寄件者");
      return;
    }
    setAuthorizedSenders((current) => [...current, { key: `new-${Date.now()}`, email, label: newAuthorizedSenderLabel.trim(), isActive: true }]);
    setNewAuthorizedSenderEmail("");
    setNewAuthorizedSenderLabel("");
  };
  const removeAuthorizedSender = (key: string) => {
    if (authorizedSenders.length <= 1) {
      toast.error("至少需保留一個授權寄件者；如需停止使用，請先關閉離線指令");
      return;
    }
    setAuthorizedSenders((current) => current.filter((sender) => sender.key !== key));
  };
  const toggleAuthorizedSender = (key: string) => {
    setAuthorizedSenders((current) => current.map((sender) => sender.key === key ? { ...sender, isActive: !sender.isActive } : sender));
  };
  return (
    <div className="space-y-6" data-testid="system-maintenance-page">
      <div>
        <h1 className="page-title">系統維護</h1>
        <p className="page-subtitle">SYSTEM MAINTENANCE CONTROL</p>
      </div>

      <Card className={`system-maintenance-card system-maintenance-status-card system-maintenance-status-card--${systemMode} ${systemMode === "maintenance" ? "border-amber-500/50 bg-amber-950/15" : systemMode === "offline" ? "border-rose-500/50 bg-rose-950/15" : "border-emerald-500/35 bg-emerald-950/10"}`}>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {systemMode === "maintenance" ? <Wrench className="text-amber-300" size={19} /> : systemMode === "offline" ? <CircleOff className="text-rose-300" size={19} /> : <CircleCheck className="text-emerald-300" size={19} />}
              {currentModeCopy.label}
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl leading-6">
              {currentModeCopy.description}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => settings.refetch()} disabled={settings.isFetching} className="system-maintenance-action-button">
            <RefreshCw className={`mr-2 ${settings.isFetching ? "animate-spin" : ""}`} size={15} />重新整理
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="system-maintenance-context-panel rounded border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">最後更新：</span>{settings.data?.updatedAt ? new Date(settings.data.updatedAt).toLocaleString("zh-TW") : "尚未設定（系統預設為正常運作）"}</p>
            <p className="mt-2"><span className="font-semibold text-foreground">登入規則：</span>{currentModeCopy.loginRule}</p>
            {settings.data?.announcement && <p className="mt-2"><span className="font-semibold text-foreground">登入入口公告：</span>已設定</p>}
            {settings.data?.estimatedRestoredAt && <p className="mt-2"><span className="font-semibold text-foreground">登入入口恢復時間：</span>已設定</p>}
          </div>
          <div className="system-maintenance-fields-panel grid gap-4 rounded border border-white/10 bg-black/10 p-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="system-mode-announcement">使用者公告</Label>
              <Textarea id="system-mode-announcement" value={announcement} onChange={(event) => setAnnouncement(event.target.value)} maxLength={600} placeholder="例如：系統將進行例行維護，請先完成正在處理的作業" className="min-h-24 resize-y" />
              <p className="text-xs text-muted-foreground">此公告內容只會在登入入口向使用者顯示；已登入使用者僅收到倒數登出提示</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated-restored-at">預計恢復時間</Label>
              <Input id="estimated-restored-at" type="datetime-local" value={estimatedRestoredAt} onChange={(event) => setEstimatedRestoredAt(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled-system-mode">預告開始時間</Label>
              <Input id="scheduled-system-mode" type="datetime-local" value={scheduledFor} min={toDateTimeInputValue(new Date(Date.now() + 60_000))} onChange={(event) => setScheduledFor(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => requestModeChange("online")} disabled={settings.isLoading || setSystemMode.isPending || systemMode === "online"} className="system-maintenance-action-button border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/10"><CircleCheck className="mr-2" size={16} />設為 SYSTEM ONLINE</Button>
            <Button variant="outline" onClick={() => requestModeChange("maintenance")} disabled={settings.isLoading || setSystemMode.isPending || systemMode === "maintenance"} className="system-maintenance-action-button border-amber-400/50 text-amber-200 hover:bg-amber-500/10"><Wrench className="mr-2" size={16} />啟用系統維護</Button>
            <Button variant="destructive" onClick={() => requestModeChange("offline")} disabled={settings.isLoading || setSystemMode.isPending || systemMode === "offline"} className="system-maintenance-action-button bg-rose-700 text-white hover:bg-rose-800"><Power className="mr-2" size={16} />設為 SYSTEM OFFLINE</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="system-maintenance-card system-maintenance-schedule-card border-cyan-500/30 bg-cyan-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BellRing className="text-cyan-300" size={18} />維護預告與倒數登出</CardTitle>
          <CardDescription>預告建立後，已登入的非創始管理員會看到即時倒數與公告；時間到達後系統才會啟用指定模式並安全登出</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduledMode && settings.data?.scheduledFor ? (
            <div className="rounded border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm">
              <p className="font-semibold text-cyan-100"><CalendarClock className="mr-2 inline" size={16} />已預告 {scheduledModeCopy?.label}</p>
              <p className="mt-2 text-muted-foreground">開始時間：{new Date(settings.data.scheduledFor).toLocaleString("zh-TW")}</p>
              <Button variant="outline" size="sm" onClick={() => cancelScheduledMode.mutate()} disabled={cancelScheduledMode.isPending} className="mt-3 border-rose-400/50 text-rose-200 hover:bg-rose-500/10">{cancelScheduledMode.isPending ? "取消中…" : "取消預告"}</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => createSchedule("maintenance")} disabled={scheduleMode.isPending || systemMode !== "online"} className="border-amber-400/50 text-amber-200 hover:bg-amber-500/10"><Wrench className="mr-2" size={16} />預告 SYSTEM MAINTENANCE</Button>
              <Button variant="outline" onClick={() => createSchedule("offline")} disabled={scheduleMode.isPending || systemMode !== "online"} className="border-rose-400/50 text-rose-200 hover:bg-rose-500/10"><Power className="mr-2" size={16} />預告 SYSTEM OFFLINE</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="system-maintenance-card system-maintenance-email-card border-violet-500/35 bg-violet-950/10" data-testid="email-offline-command-panel">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><MailCheck className="text-violet-300" size={18} />Gmail 授權郵件緊急離線</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">Google Apps Script 每分鐘掃描 Gmail 專用標籤並送出簽章指令；只有授權寄件者、固定主旨、無附件且通過 SPF／DKIM／DMARC 驗證的信件，才可切換 SYSTEM OFFLINE此入口無法讓系統恢復上線</CardDescription>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${emailOfflineCommand.data?.isEnabled ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-amber-400/50 bg-amber-500/10 text-amber-200"}`}>
            {emailOfflineCommand.data?.isEnabled ? "PROTECTED COMMAND ENABLED" : "COMMAND DISABLED"}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 rounded border border-white/10 bg-black/10 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gmail-offline-recipient">系統通知 Gmail 收件地址</Label>
              <Input id="gmail-offline-recipient" type="email" value={offlineCommandRecipient} onChange={(event) => setOfflineCommandRecipient(event.target.value)} placeholder="your-system-notify@gmail.com" autoComplete="off" />
              <p className="text-xs text-muted-foreground">請填寫系統通知使用的同一個 Gmail；安裝 Apps Script 時，也必須將此地址設為 QSSH_OFFLINE_RECIPIENT</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmail-offline-senders">授權寄件者</Label>
              <div className="space-y-2 rounded border border-white/10 bg-black/10 p-3" data-testid="authorized-sender-manager">
                {authorizedSenders.length ? authorizedSenders.map((sender) => (
                  <div key={sender.key} className="flex flex-wrap items-center gap-2 rounded border border-white/10 bg-background/40 px-2 py-2 text-xs">
                    <button type="button" role="switch" aria-checked={sender.isActive} onClick={() => toggleAuthorizedSender(sender.key)} className={`rounded px-2 py-1 font-semibold ${sender.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>{sender.isActive ? "已啟用" : "已停用"}</button>
                    <span className="min-w-0 flex-1 truncate font-mono text-foreground">{sender.email}</span>
                    {sender.label && <span className="text-muted-foreground">{sender.label}</span>}
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAuthorizedSender(sender.key)} aria-label={`移除 ${sender.email}`} className="h-7 w-7 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"><Trash2 size={14} /></Button>
                  </div>
                )) : <p className="py-2 text-xs text-muted-foreground">尚未設定授權寄件者</p>}
                <div className="grid gap-2 pt-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]">
                  <Input value={newAuthorizedSenderEmail} onChange={(event) => setNewAuthorizedSenderEmail(event.target.value)} type="email" placeholder="new-sender@gmail.com" autoComplete="off" aria-label="新增授權 Gmail 地址" />
                  <Input value={newAuthorizedSenderLabel} onChange={(event) => setNewAuthorizedSenderLabel(event.target.value)} placeholder="備註（選填）" maxLength={128} aria-label="授權 Gmail 備註" />
                  <Button type="button" variant="outline" onClick={addAuthorizedSender} className="border-violet-400/50 text-violet-200 hover:bg-violet-500/10"><Plus className="mr-1" size={15} />新增</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">可新增、移除或停用帳號；最多八個變更後按「儲存授權設定」才會生效</p>
            </div>
          </div>

          <div className="rounded border border-violet-300/25 bg-violet-300/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="text-violet-300" size={17} />安全啟用狀態</div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={offlineCommandEnabled} onChange={(event) => setOfflineCommandEnabled(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                啟用授權郵件離線指令
              </label>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">啟用前，請先完成 Apps Script 安裝、簽章密鑰與 Gmail 專用標籤設定關閉開關後，即使收到已簽章的請求，系統也不會切換模式，且會留下收件稽核</p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button onClick={() => saveAuthorizedEmailCommand(false)} disabled={saveEmailOfflineCommand.isPending || emailOfflineCommand.isLoading} className="bg-violet-700 text-white hover:bg-violet-800"><MailCheck className="mr-2" size={16} />{saveEmailOfflineCommand.isPending ? "儲存中…" : "儲存授權設定"}</Button>
            <Button variant="outline" onClick={() => saveAuthorizedEmailCommand(true)} disabled={saveEmailOfflineCommand.isPending || emailOfflineCommand.isLoading} className="border-violet-400/50 text-violet-200 hover:bg-violet-500/10"><KeyRound className="mr-2" size={16} />輪替 Apps Script 簽章密鑰</Button>
          </div>

          <div className="grid gap-4 rounded border border-white/10 bg-black/10 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Gmail 專用標籤</Label>
              <Input value={emailOfflineCommand.data?.gmailAutomationLabel ?? "QSSH_OFFLINE_COMMAND"} readOnly className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">請在 Gmail 篩選器中，為固定主旨的指令信套用此標籤Google Apps Script 只掃描帶有此標籤的郵件</p>
            </div>
            <div className="space-y-2">
              <Label>固定指令格式</Label>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-white/10 bg-black/20 p-3 text-xs leading-6 text-muted-foreground">{`To: ${offlineCommandRecipient || "系統通知 Gmail"}\nSubject: ${emailOfflineCommand.data?.commandSubject ?? "QSSH MEDIA SERVICE SYSTEM"}\n\n${emailOfflineCommand.data?.commandBody ?? "Media Server System is abnormal,Please go offline immediately."}`}</pre>
              <p className="text-xs text-muted-foreground">收件者、主旨與內文為不可變更的安全格式，必須完全符合Apps Script 以簽章密鑰驗證請求，系統再核對寄件者、時效與郵件 ID 防重放</p>
            </div>
          </div>

          <div className="rounded border border-cyan-300/25 bg-cyan-300/5 p-4" data-testid="gmail-automation-status">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="text-cyan-300" size={17} />Google Apps Script 自動收信</p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Apps Script 以每分鐘觸發器掃描 Gmail 專用標籤，將已簽章的指令送入此系統；不再依賴網站背景輪詢或 Gmail 應用程式密碼</p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${emailOfflineCommand.data?.isEnabled ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-amber-400/50 bg-amber-500/10 text-amber-200"}`}>{emailOfflineCommand.data?.isEnabled ? "等待 APPS SCRIPT 觸發" : "COMMAND DISABLED"}</div>
            </div>
            <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="mb-1">Apps Script 指令端點</p>
                <code className="block break-all rounded border border-white/10 bg-black/20 px-3 py-2 text-cyan-100">{appsScriptEndpoint}</code>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(appsScriptEndpoint).then(() => toast.success("端點已複製"), () => toast.error("無法複製端點"))} className="self-end border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/10"><Copy className="mr-2" size={15} />複製</Button>
              <p>最近觸發：{emailOfflineCommand.data?.appsScriptAutomation.lastTriggeredAt ? new Date(emailOfflineCommand.data.appsScriptAutomation.lastTriggeredAt).toLocaleString("zh-TW") : "尚無紀錄"}</p>
              {emailOfflineCommand.data?.appsScriptAutomation.lastTriggerError && <p className="sm:col-span-2 text-rose-300">最近錯誤：{emailOfflineCommand.data.appsScriptAutomation.lastTriggerError}</p>}
            </div>
          </div>

          <div className="rounded border border-white/10 bg-black/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="text-violet-300" size={16} />最近收件稽核</div>
            {emailOfflineCommandHistory.isLoading ? <p className="text-sm text-muted-foreground">正在載入收件稽核…</p> : emailOfflineCommandHistory.data?.length ? (
              <div className="space-y-2">
                {emailOfflineCommandHistory.data.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="grid gap-1 rounded border border-white/8 px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center md:gap-3">
                    <span className="truncate font-mono text-foreground">{entry.senderEmail ?? "未提供寄件者"}</span>
                    <span className={entry.status === "accepted" ? "text-emerald-300" : "text-rose-300"}>{entry.status === "accepted" ? (entry.resultingMode === "already_offline" ? "已是離線" : "已切換離線") : entry.rejectionCode ?? "已拒絕"}</span>
                    {entry.status === "accepted" ? <span className={entry.replyStatus === "sent" ? "text-cyan-200" : entry.replyStatus === "failed" ? "text-rose-300" : "text-muted-foreground"}>{entry.replyStatus === "sent" ? "已回覆寄件者" : entry.replyStatus === "failed" ? "回覆寄送失敗" : "尚無回覆紀錄"}</span> : <span />}
                    <span className="text-muted-foreground">{new Date(entry.receivedAt).toLocaleString("zh-TW")}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">目前尚無 Gmail 指令收件紀錄</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="system-maintenance-card system-maintenance-guidance-card">
        <CardHeader><CardTitle className="text-base">創始管理員維護說明</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>此設定只對創始管理員開放，且每次切換都會寫入操作日誌</p>
          <p>切換至 SYSTEM MAINTENANCE 或 SYSTEM OFFLINE 時，所有非創始管理員工作階段會在狀態同步後被安全結束，且後續受保護操作與登入都會被阻止</p>
        </CardContent>
      </Card>

      <AlertDialog open={appsScriptSecretOpen} onOpenChange={(open) => {
        if (!open) {
          setAppsScriptSecretOpen(false);
          setAppsScriptSecret(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apps Script 簽章密鑰</AlertDialogTitle>
            <AlertDialogDescription>此密鑰僅顯示一次請立即複製至 Google Apps Script 的 Script Properties，切勿放入郵件內容、截圖或一般文件</AlertDialogDescription>
          </AlertDialogHeader>
          <code className="block break-all rounded border border-violet-400/30 bg-violet-500/10 p-3 text-sm text-violet-100">{appsScriptSecret}</code>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => navigator.clipboard?.writeText(appsScriptSecret ?? "").then(() => toast.success("簽章密鑰已複製"), () => toast.error("無法複製簽章密鑰"))}><Copy className="mr-2" size={16} />複製密鑰</Button>
            <AlertDialogAction onClick={() => { setAppsScriptSecretOpen(false); setAppsScriptSecret(null); }}>我已安全保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !setSystemMode.isPending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認切換至 {SYSTEM_MODE_COPY[targetMode].label}？</AlertDialogTitle>
            <AlertDialogDescription>
              {targetMode === "online"
                ? "其他已啟用帳號將可再次依正常安全流程登入系統"
                : `切換後，所有非創始管理員將被安全登出，並收到「${targetMode === "maintenance" ? "系統維護中" : "系統離線中"}」提示`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setSystemMode.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={mutateMode}
              disabled={setSystemMode.isPending}
              className={targetMode === "online" ? "bg-emerald-700 text-white hover:bg-emerald-800" : targetMode === "maintenance" ? "bg-amber-700 text-white hover:bg-amber-800" : "bg-rose-700 text-white hover:bg-rose-800"}
            >
              {setSystemMode.isPending ? "更新中…" : `確認切換至 ${SYSTEM_MODE_COPY[targetMode].label}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
